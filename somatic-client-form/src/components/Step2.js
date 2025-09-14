import React from 'react';

const Step2 = () => (
  <div className="space-y-4 fade-in">
    <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 2: Contact Verification</h2>
    <input type="tel" placeholder="Phone Number" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition" />
    <input type="email" placeholder="Secondary Email (optional)" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition" />
  </div>
);

export default Step2;