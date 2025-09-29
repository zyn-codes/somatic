import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="form-hero flex flex-col justify-center items-center px-4">
  <div className="form-panel max-w-4xl w-full rounded-lg p-8 text-center fade-in">
    <h1 className="text-4xl sm:text-5xl font-bold mb-4 font-inter">Somatic Client Form</h1>
    <p className="text-lg sm:text-xl mb-6 italic">Please complete the following steps to book your free consultation call.</p>
    <p className="text-sm mb-8">Trusted by 500+ clients for transformative sessions.</p>
    <Link to="/form">
      <button className="primary-btn text-lg mt-8">
        Book your free call now
      </button>
    </Link>
  </div>
</div>

  );
};

export default LandingPage;