import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  onSnapshot,
  limit,
  or,
  and
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface Friendship {
  id: string;
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  updatedAt?: any;
  friendProfile?: UserProfile;
}

const FRIENDSHIPS_COLLECTION = 'friendships';
const USERS_COLLECTION = 'users';

export const sendFriendRequestByEmail = async (email: string) => {
  if (!auth.currentUser) throw new Error('User not authenticated');
  const currentUserUid = auth.currentUser.uid;
  const currentUserName = auth.currentUser.displayName || 'A friend';

  if (email === auth.currentUser.email) {
    throw new Error("You cannot add yourself as a friend");
  }

  // Find user by email
  const userQuery = query(
    collection(db, USERS_COLLECTION),
    where('email', '==', email),
    limit(1)
  );
  
  const userSnapshot = await getDocs(userQuery);
  
  if (userSnapshot.empty) {
    // User not found - create an invitation
    // In a real app, this would trigger a Cloud Function to send an email
    await addDoc(collection(db, 'invitations'), {
      email,
      invitedBy: currentUserUid,
      invitedByName: currentUserName,
      status: 'sent',
      createdAt: serverTimestamp()
    });
    
    const mailtoUrl = `mailto:${email}?subject=Join me on this app!&body=Hi! I'm using this app and I'd love for you to join me. You can sign up here: ${window.location.origin}`;
    
    return { 
      status: 'invited', 
      message: `User not registered. Opening your email client to send an invitation to ${email}!`,
      mailtoUrl 
    };
  }

  const targetUser = userSnapshot.docs[0].data() as UserProfile;
  const targetUid = targetUser.uid;

  // Check if friendship already exists
  const existingQuery = query(
    collection(db, FRIENDSHIPS_COLLECTION),
    or(
      and(where('fromUid', '==', currentUserUid), where('toUid', '==', targetUid)),
      and(where('fromUid', '==', targetUid), where('toUid', '==', currentUserUid))
    )
  );

  const existingSnapshot = await getDocs(existingQuery);
  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0].data() as Friendship;
    if (existing.status === 'accepted') throw new Error('Already friends');
    if (existing.status === 'pending') throw new Error('Request already pending');
    // If declined, we could allow re-sending or just update it
    await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, existingSnapshot.docs[0].id));
  }

  // Create new request
  await addDoc(collection(db, FRIENDSHIPS_COLLECTION), {
    fromUid: currentUserUid,
    toUid: targetUid,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  return { status: 'sent', message: 'Friend request sent!' };
};

export const acceptFriendRequest = async (requestId: string) => {
  const requestRef = doc(db, FRIENDSHIPS_COLLECTION, requestId);
  await updateDoc(requestRef, {
    status: 'accepted',
    updatedAt: serverTimestamp()
  });
};

export const declineFriendRequest = async (requestId: string) => {
  const requestRef = doc(db, FRIENDSHIPS_COLLECTION, requestId);
  await updateDoc(requestRef, {
    status: 'declined',
    updatedAt: serverTimestamp()
  });
};

export const removeFriend = async (friendshipId: string) => {
  try {
    await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, friendshipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, FRIENDSHIPS_COLLECTION);
  }
};

export const subscribeToFriendships = (
  uid: string, 
  callback: (friendships: Friendship[]) => void
) => {
  const q = query(
    collection(db, FRIENDSHIPS_COLLECTION),
    or(where('fromUid', '==', uid), where('toUid', '==', uid))
  );

  return onSnapshot(q, async (snapshot) => {
    const friendships = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Friendship[];

    // Fetch profiles for each friendship
    const friendshipsWithProfiles = await Promise.all(
      friendships.map(async (f) => {
        const friendUid = f.fromUid === uid ? f.toUid : f.fromUid;
        const profileRef = doc(db, USERS_COLLECTION, friendUid);
        const profileSnap = await getDoc(profileRef);
        return {
          ...f,
          friendProfile: profileSnap.exists() ? profileSnap.data() as UserProfile : undefined
        };
      })
    );

    callback(friendshipsWithProfiles);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, FRIENDSHIPS_COLLECTION);
  });
};

// Helper to get user profile by UID
export const getUserProfile = async (uid: string) => {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists() ? profileSnap.data() as UserProfile : null;
};
