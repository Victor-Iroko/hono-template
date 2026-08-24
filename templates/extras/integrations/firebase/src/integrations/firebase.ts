import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getEnv } from "../core/env-validation.js";
import { unauthorizedError, internalError } from "../core/errors.js";

export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

let firebaseApp: App | undefined;

export function getFirebaseAdminApp(): App {
  if (firebaseApp) return firebaseApp;

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const env = getEnv();
  const serviceAccountKey = env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const parsed = JSON.parse(serviceAccountKey) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const privateKey = (parsed.private_key || "").replace(/\\n/g, "\n");
      firebaseApp = initializeApp({
        credential: cert({
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey,
        }),
      });
      return firebaseApp;
    } catch (err) {
      throw internalError(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${(err as Error).message}`, err);
    }
  }

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    return firebaseApp;
  }

  if (projectId) {
    firebaseApp = initializeApp({ projectId });
    return firebaseApp;
  }

  firebaseApp = initializeApp();
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export async function verifyFirebaseToken(idToken: string): Promise<FirebaseUser> {
  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(idToken);

    if (!decoded.email) {
      throw unauthorizedError("Firebase token does not contain an email address");
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || "",
      picture: decoded.picture,
      email_verified: decoded.email_verified,
    };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "unauthorized") {
      throw error;
    }
    throw unauthorizedError(`Invalid Firebase token: ${(error as Error).message}`, { cause: error });
  }
}
