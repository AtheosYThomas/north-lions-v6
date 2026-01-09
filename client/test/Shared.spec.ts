
import { describe, it, expect } from 'vitest';
import type { Member, Event, Registration } from '../shared/types';

describe('Shared Types', () => {
  it('should validate Member interface', () => {
    const member: Member = {
      id: '123',
      name: 'Test Member',
      contact: {
        mobile: '0912345678',
        email: 'test@example.com',
        lineUserId: 'line123'
      },
      organization: {
        role: 'member',
        title: 'Member'
      },
      personal: {
        joinDate: new Date()
      },
      company: {
        name: 'Test Corp',
        taxId: '12345678'
      },
      emergency: {
        contactName: 'Emergency',
        relationship: 'Family',
        phone: '0987654321'
      },
      status: {
        activeStatus: 'active',
        membershipType: 'regular'
      },
      system: {
        role: 'member',
        pushConsent: true
      },
      stats: {
        totalDonation: 0,
        donationCount: 0
      }
    };
    expect(member.name).toBe('Test Member');
  });

  it('should validate Event interface', () => {
    const event: Event = {
      id: 'evt1',
      name: 'Monthly Meeting',
      time: {
        date: new Date(),
        start: new Date(),
        end: new Date(),
        deadline: new Date()
      },
      details: {
        location: 'Taipei',
        cost: 0,
        quota: 100,
        isPaidEvent: false
      },
      status: {
        eventStatus: 'published',
        registrationStatus: 'open',
        pushStatus: 'pending'
      },
      category: 'meeting',
      publishing: {
        target: ['all'],
        publisherId: 'admin1',
        content: 'Meeting content'
      },
      stats: {
        registeredCount: 0
      },
      system: {
        code: 'EVT001'
      },
      related: {}
    };
    expect(event.name).toBe('Monthly Meeting');
  });
});
