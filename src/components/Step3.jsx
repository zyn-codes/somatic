const Step3 = () => {
  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 3: Appointment / VIP Options</h2>
      <select className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition">
        <option>Select Slot</option>
        <option>Mon, 10 AM</option>
        <option>Tue, 2 PM</option>
      </select>
      <label className="flex items-center">
        <input type="checkbox" className="mr-2" />
        <span className="text-gray-600">VIP Fast-Track (Limited Spots) <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Priority</span></span>
      </label>
      <p className="text-sm text-gray-500">Limited slots available—select now!</p>
    </div>
  );
};

export default Step3;