import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
      retryCount: 0
    });
    
    this.logError(error, errorInfo);
  }

  async logError(error, errorInfo) {
    try {
      const errorData = {
        type: 'error',
        error: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        retryCount: this.state.retryCount
      };

      // Log to server
      await fetch('/api/log-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });

      // Store in sessionStorage for recovery attempts
      sessionStorage.setItem('lastError', JSON.stringify({
        ...errorData,
        recoveryAttempted: false
      }));

    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  handleRetry = async () => {
    this.setState({ isRecovering: true });

    try {
      // Clear any cached data that might be causing the error
      sessionStorage.removeItem('formData');
      localStorage.removeItem('formCache');

      // Attempt to restore last known good state
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      this.setState(state => ({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        retryCount: state.retryCount + 1
      }));

    } catch (error) {
      this.setState({
        isRecovering: false,
        error,
        hasError: true
      });
      this.logError(error, { componentStack: 'Recovery attempt failed' });
    }
  };

  handleReset = () => {
    // Clear all storage and reload
    try {
      sessionStorage.clear();
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error('Failed to reset application:', e);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isProd = process.env.NODE_ENV === 'production';

      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isProd ? "Something went wrong" : "Application Error"}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {this.state.isRecovering 
                ? "Attempting to recover your session..."
                : "We've encountered an unexpected error and have logged the details for investigation."}
            </p>

            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                disabled={this.state.isRecovering}
                className={`w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium 
                  ${this.state.isRecovering 
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-700 hover:shadow-lg transform transition-all duration-200 hover:-translate-y-0.5'}`}
              >
                {this.state.isRecovering ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Recovering...
                  </span>
                ) : "Try to Recover"}
              </button>

              <button
                onClick={this.handleReset}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium
                  hover:bg-gray-200 transition-colors duration-200"
              >
                Reset Application
              </button>
            </div>

            {!isProd && this.state.error && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Error Details</h3>
                  <span className="text-xs text-gray-500">Attempt #{this.state.retryCount + 1}</span>
                </div>
                <pre className="text-xs text-red-600 overflow-auto">
                  {this.state.error.toString()}
                </pre>
                <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;