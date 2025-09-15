const Step1 = () => {
  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 font-inter">Step 1: Personal Info</h2>
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input type="text" placeholder="First Name" className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm bg-white px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">E.g., John</span>
      </div>
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input type="text" placeholder="Last Name" className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm bg-white px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">E.g., Doe</span>
      </div>
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input type="email" placeholder="Email" className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm bg-white px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">We value your privacy</span>
      </div>
    </div>
  );
};

export default Step1;