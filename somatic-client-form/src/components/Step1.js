import React from 'react';

const Step1 = () => (
  <div className="space-y-4 fade-in">
    <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 1: Personal Info</h2>
    <div className="relative">
      <input type="text" placeholder="First Name" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition" />
      <span className="absolute right-3 top-3 text-gray-400 text-sm">E.g., John</span>
    </div>
    <div className="relative">
      <input type="text" placeholder="Last Name" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition" />
      <span className="absolute right-3 top-3 text-gray-400 text-sm">E.g., Doe</span>
    </div>
    <div className="relative">
      <input type="email" placeholder="Email" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition" />
      <span className="absolute right-3 top-3 text-gray-400 text-sm">We value your privacy</span>
    </div>
  </div>
);

export default Step1;