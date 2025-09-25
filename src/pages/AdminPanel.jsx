import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    searchTerm: '',
    dateRange: 'all'
  });
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clean up socket connection on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Apply filters to visits
  useEffect(() => {
    let filtered = [...visits];
    
    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(visit => visit.type === filters.type);
    }
    
    // Filter by date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (filters.dateRange !== 'all') {
      filtered = filtered.filter(visit => {
        const visitDate = new Date(visit.timestamp);
        switch (filters.dateRange) {
          case 'today':
            return visitDate >= today;
          case 'week':
            return visitDate >= week;
          case 'month':
            return visitDate >= month;
          default:
            return true;
        }
      });
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(visit => {
        const searchableFields = [
          visit.ip,
          visit.location?.city,
          visit.location?.country,
          visit.personalInfo?.firstName,
          visit.personalInfo?.lastName,
          visit.personalInfo?.email,
          visit.contactInfo?.phone,
          visit.ua_parsed?.browser?.name,
          visit.ua_parsed?.os?.name
        ].filter(Boolean).map(field => field.toLowerCase());
        
        return searchableFields.some(field => field.includes(searchLower));
      });
    }
    
    setFilteredVisits(filtered);
  }, [visits, filters]);

  const handleLogin = async () => {
    try {
      setError(''); // Clear any previous errors
      
      if (!password.trim()) {
        setError('Password is required');
        return;
      }

      // Create socket connection with auth
      if (socket) {
        socket.close(); // Close any existing connection
      }
      
      // Connect to admin namespace using relative path
      const socketInstance = io('/admin', {
        auth: { token: password },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        forceNew: true
      });

      // Handle connection events
      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsAuthenticated(true);
        setSocket(socketInstance);
        fetchVisits();
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        const errorMessage = err.message === 'Authentication failed' 
          ? 'Invalid password' 
          : err.message.includes('Too many authentication attempts')
          ? 'Too many attempts. Please try again later.'
          : 'Failed to connect to server. Please try again.';
        setError(errorMessage);
        socketInstance.close();
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          setError('Disconnected by server');
          setIsAuthenticated(false);
        }
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        setError('Connection error: ' + error.message);
      });

      socketInstance.on('visit', (newVisit) => {
        console.log('New visit received:', newVisit);
        setVisits(prev => {
          // Prevent duplicate entries
          const existingIndex = prev.findIndex(v => v.timestamp === newVisit.timestamp);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newVisit;
            return updated;
          }
          return [newVisit, ...prev];
        });
      });

      socketInstance.on('reconnect', (attempt) => {
        console.log(`Reconnected after ${attempt} attempts`);
        // Refetch data to ensure we didn't miss anything
        fetchVisits();
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        setError('Connection lost. Attempting to reconnect...');
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('Failed to reconnect');
        setError('Connection lost. Please refresh the page.');
      });

      // Handle connection timeout
      const timeoutId = setTimeout(() => {
        if (!socketInstance.connected) {
          socketInstance.close();
          setError('Connection timeout. Please try again.');
        }
      }, 10000);

      // Clean up timeout on successful connection
      socketInstance.on('connect', () => {
        clearTimeout(timeoutId);
      });

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred: ' + err.message);
    }
  };

  const fetchVisits = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3959';
      const response = await fetch(`${apiBase}/api/clicks`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }
      
      // Sort visits by timestamp in descending order
      const sortedVisits = data.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setVisits(sortedVisits);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setError('Failed to load visit data: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <h2 className="text-3xl font-bold text-blue-800 text-center">Admin Login</h2>
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-blue-800">Admin Dashboard</h1>
              <button
                onClick={() => {
                  socket?.disconnect();
                  setIsAuthenticated(false);
                  navigate('/');
                }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Records</option>
                <option value="form_submission">Form Submissions</option>
                <option value="page_visit">Page Visits</option>
              </select>
              
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              <input
                type="text"
                placeholder="Search IP, location, or details..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 min-w-[300px]"
              />
              
              <div className="flex items-center gap-2 ml-auto">
                <div className="text-sm text-gray-500">
                  Showing {filteredVisits.length} of {visits.length} records
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVisits.map((visit, index) => (
                  <tr key={index} className={`hover:bg-gray-50 ${visit.type === 'form_submission' ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(visit.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full
                        ${visit.type === 'form_submission' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {visit.type === 'form_submission' ? 'Form' : 'Visit'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.location ? `${visit.location.city}, ${visit.location.country}` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {visit.type === 'form_submission' ? (
                        <div>
                          <p>Name: {visit.personalInfo?.firstName} {visit.personalInfo?.lastName}</p>
                          <p>Email: {visit.personalInfo?.email}</p>
                          <p>Phone: {visit.contactInfo?.phone}</p>
                        </div>
                      ) : (
                        <div>
                          <p>Browser: {visit.ua_parsed?.browser?.name || 'Unknown'}</p>
                          <p>OS: {visit.ua_parsed?.os?.name || 'Unknown'}</p>
                          <p>Device: {visit.ua_parsed?.device?.type || 'Desktop'}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full
                        ${visit.score > 70 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {visit.score > 70 ? 'High' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;