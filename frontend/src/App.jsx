import React from 'react';
import Dashboard from './Dashboard';
import { useSpectar } from './useSpectar';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', background: '#222', padding: '20px', fontFamily: 'monospace' }}>
          <h2>React Render Engine Crash!</h2>
          <p>{this.state.error.toString()}</p>
          <pre style={{ fontSize: '12px', marginTop: '10px', color: '#ffaaaa' }}>
            {this.state.error.stack}
          </pre>
        </div>;
    }
    return this.props.children; 
  }
}

export default function App() {
  const { sensorData, threatHistory, alerts, connected, breachState, cancelBreach, approveBreach, triggerBreach } = useSpectar();

  return (
    <ErrorBoundary>
      <div className="spectar-bg" />
      <Dashboard
        sensorData={sensorData}
        threatHistory={threatHistory}
        alerts={alerts}
        connected={connected}
        breachState={breachState}
        cancelBreach={cancelBreach}
        approveBreach={approveBreach}
        triggerBreach={triggerBreach}
      />
    </ErrorBoundary>
  );
}