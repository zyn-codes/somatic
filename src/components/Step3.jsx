const Step3 = () => {
  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 3: Appointment Details</h2>
      <select className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition">
        <option value="">Select Time Zone</option>
        <option value="America/New_York">Eastern Time (ET)</option>
        <option value="America/Chicago">Central Time (CT)</option>
        <option value="America/Denver">Mountain Time (MT)</option>
        <option value="America/Los_Angeles">Pacific Time (PT)</option>
      </select>
      <select className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition">
        <option value="">Select Available Slot</option>
        <option value="1">Monday, 10:00 AM - Priority Slot</option>
        <option value="2">Monday, 2:00 PM - VIP Session</option>
        <option value="3">Tuesday, 11:00 AM - Priority Slot</option>
        <option value="4">Tuesday, 3:00 PM - VIP Session</option>
      </select>
      <div className="space-y-2">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" />
          <span className="text-gray-600">Priority Processing <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Recommended</span></span>
        </label>
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" />
          <span className="text-gray-600">Send appointment reminders</span>
        </label>
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" />
          <span className="text-gray-600">I agree to the terms and session recording</span>
        </label>
      </div>
      <textarea
        placeholder="Any special requirements or notes for your session?"
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition h-24"
      ></textarea>
      <p className="text-sm text-gray-500">Secure your preferred slot now - Limited availability!</p>
    </div>
  );
};

export default Step3;