import React, { useEffect, useState } from 'react';

export default function ProfilePage({}) {
  const [user, setUser] = useState<any>({ email: 'demo@example.com', reputation: 1000, honor_level: 1 });

  useEffect(() => {
    // Offline demo: static profile
  }, []);

  return (
    <div>
      <h1>{user.email}</h1>
      <div>Reputation: {user.reputation}</div>
      <div>Honor Level: {user.honor_level}</div>
      <h3>Recent Reputation Records (stub)</h3>
      <div className="text-sm text-gray-600">No records in offline demo.</div>
    </div>
  );
}
