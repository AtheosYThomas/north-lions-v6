
import { Member } from 'shared/types';

describe('Shared Integration', () => {
  it('should be able to import Member type', () => {
    const member: Member = {
      name: 'Test User',
      contact: {
        mobile: '0912345678',
        email: 'test@example.com',
        lineUserId: 'U1234567890abcdef',
      },
      organization: {
        role: 'member',
        title: 'Member',
      },
      personal: {},
      company: {
        name: 'Test Corp',
        taxId: '12345678',
      },
      emergency: {
        contactName: 'Emergency',
        relationship: 'Friend',
        phone: '0987654321',
      },
      status: {
        activeStatus: 'active',
        membershipType: 'regular',
      },
      system: {
        role: 'member',
        pushConsent: true,
      },
      stats: {
        totalDonation: 0,
        donationCount: 0,
      },
    };
    expect(member.name).toBe('Test User');
  });
});
