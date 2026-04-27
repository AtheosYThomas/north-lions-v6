import * as admin from 'firebase-admin';

export type MemberAuthProfile = {
  found: boolean;
  memberId: string;
  memberName: string;
  memberData: any;
  isAdmin: boolean;
  snapshot: FirebaseFirestore.QuerySnapshot;
};

function hasAdminAccess(memberData: any): boolean {
  if (!memberData) return false;
  const sysRole = String(memberData?.system?.role || '').toLowerCase();
  const baseRole = String(memberData?.role || '').toLowerCase();
  const position = String(memberData?.position || memberData?.organization?.role || '');
  return (
    sysRole === 'admin' ||
    baseRole === 'admin' ||
    position.includes('會長') ||
    position.includes('秘書') ||
    position.includes('財務')
  );
}

export async function resolveMemberProfileByLineUserId(
  db: admin.firestore.Firestore,
  lineUserId: string
): Promise<MemberAuthProfile> {
  const memberSnapshot = await db.collection('members')
    .where('contact.lineUserId', '==', lineUserId)
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    return {
      found: false,
      memberId: '',
      memberName: 'Unknown',
      memberData: null,
      isAdmin: false,
      snapshot: memberSnapshot
    };
  }

  const memberDoc = memberSnapshot.docs[0];
  const memberData = memberDoc.data() as any;
  return {
    found: true,
    memberId: memberDoc.id,
    memberName: memberData?.name || 'Unknown',
    memberData,
    isAdmin: hasAdminAccess(memberData),
    snapshot: memberSnapshot
  };
}
