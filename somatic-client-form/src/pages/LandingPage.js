import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-4">
      <div className="max-w-4xl w-full bg-white shadow-neumorphic rounded-lg p-8 text-center fade-in">
        <h1 className="text-4xl sm:text-5xl font-bold text-blue-800 mb-4 font-inter">Somatic Client Form</h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-6 italic">Please complete the following steps to confirm your session.</p>
        <p className="text-sm text-gray-500 mb-8">Trusted by 500+ clients for transformative sessions.</p>
        <img
          src="https://images.unsplash.com/photo-1586769852044-3c4e9e7e3e79?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
          alt="Corporate Hero"
          className="w-full h-auto rounded-md mb-8"
          loading="lazy"
        />
        <Link to="/form">
          <button className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-md text-lg font-semibold hover:from-blue-700 hover:to-blue-900 transition duration-300 ease-in-out transform hover:scale-105 pulse-anim">
            Secure Your Session Now
          </button>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;