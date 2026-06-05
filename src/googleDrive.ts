import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive.file");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // In a real OAuth flow with Firebase popups, the token might be cached
      // if signed in previously in this session, or we can prompt a swift popup/refresh.
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we don't have cachedAccessToken but user exists, we might need a quick sign in token
        // Usually, firebase popups need user gesture, so we keep token states in memory.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
}

/**
 * Lists all file templates ending in .labelpro from Google Drive.
 */
export const listDriveFiles = async (accessToken: string): Promise<DriveFile[]> => {
  const q = "name contains '.labelpro' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,createdTime,modifiedTime)&orderBy=modifiedTime desc`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to list files from Google Drive");
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Downloads a specific design file by ID from Google Drive.
 */
export const loadDriveFile = async (accessToken: string, fileId: string): Promise<any> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to download design file from Google Drive");
  }

  return res.json();
};

/**
 * Saves or updates a layout design file on Google Drive.
 */
export const saveDriveFile = async (
  accessToken: string,
  name: string,
  content: any,
  existingFileId?: string
): Promise<DriveFile> => {
  // Ensure name has the correct extension
  const safeName = name.endsWith(".labelpro") ? name : `${name}.labelpro`;
  const boundary = "------LABELPRO_MULTIPART_BOUNDARY------";
  
  const metadata = {
    name: safeName,
    mimeType: "application/json",
  };

  const multipartBody = 
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(content)}\r\n` +
    `--${boundary}--`;

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  }

  const res = await fetch(url, {
    method: method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to save design file to Google Drive");
  }

  return res.json();
};

/**
 * Deletes a file from Google Drive.
 */
export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to delete file from Google Drive");
  }
};

/**
 * Triggers standard client-side Google OAuth 2.0 implicit flow
 */
export const startGoogleOAuthFlow = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const origin = window.location.origin;
    const redirectUri = origin.endsWith("/") ? origin : `${origin}/`;
    const scopes = [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ];
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scopes.join(" "))}` +
      `&state=oauth2_handshake` +
      `&prompt=select_account`;
      
    const width = 520;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      "google_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );
    
    if (!popup) {
      reject(new Error("auth/popup-blocked"));
      return;
    }
    
    // Set a timeout of 5 minutes
    const timeoutId = setTimeout(() => {
      clearInterval(checkClosedInterval);
      window.removeEventListener("message", messageListener);
      try { popup.close(); } catch (_) {}
      reject(new Error("Yêu cầu đăng nhập Google đã hết hạn (timeout)."));
    }, 5 * 60 * 1000);
    
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "OAUTH2_SUCCESS" && event.data?.accessToken) {
        clearTimeout(timeoutId);
        clearInterval(checkClosedInterval);
        window.removeEventListener("message", messageListener);
        resolve(event.data.accessToken);
      } else if (event.data?.type === "OAUTH2_FAILURE") {
        clearTimeout(timeoutId);
        clearInterval(checkClosedInterval);
        window.removeEventListener("message", messageListener);
        reject(new Error(event.data.error || "Đăng nhập Google thất bại."));
      }
    };
    
    window.addEventListener("message", messageListener);
    
    const checkClosedInterval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkClosedInterval);
          clearTimeout(timeoutId);
          window.removeEventListener("message", messageListener);
          reject(new Error("auth/popup-closed-by-user"));
        }
      } catch (_) {}
    }, 1000);
  });
};

