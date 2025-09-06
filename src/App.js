import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    fetchReadmeData();
    const interval = setInterval(fetchReadmeData, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReadmeData = async () => {
    try {
      // Fetch from the root path (works for both local and custom domain)
      const response = await fetch('/README.md', {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch README');
      }
      
      const text = await response.text();
      parseReadme(text);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const parseReadme = (text) => {
    const lines = text.split('\n');
    const tableData = [];
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('| Conference') && line.includes('| CFP Ends')) {
        inTable = true;
        i++;
        continue;
      }
      
      if (inTable && line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').filter(p => p.trim());
        if (parts.length >= 5) {
          const conferenceMatch = parts[0].match(/\[(.*?)\]\((.*?)\)/);
          const conferenceName = conferenceMatch ? conferenceMatch[1] : parts[0].trim();
          const conferenceUrl = conferenceMatch ? conferenceMatch[2] : '';
          
          const cfpLinkMatch = parts[4].match(/\[(.*?)\]\((.*?)\)/);
          const cfpLinkText = cfpLinkMatch ? cfpLinkMatch[1] : parts[4].trim();
          const cfpLinkUrl = cfpLinkMatch ? cfpLinkMatch[2] : '';
          
          tableData.push({
            name: conferenceName,
            url: conferenceUrl,
            cfpEnds: parts[1].trim(),
            conferenceDate: parts[2].trim(),
            location: parts[3].trim(),
            cfpLinkText: cfpLinkText,
            cfpLinkUrl: cfpLinkUrl
          });
        }
      } else if (inTable && !line.startsWith('|')) {
        inTable = false;
      }
    }
    
    // Sort conferences by date
    const sortedData = tableData.sort((a, b) => {
      const dateA = new Date(a.cfpEnds);
      const dateB = new Date(b.cfpEnds);
      return dateA - dateB;
    });
    
    setConferences(sortedData);
  };

  const getDaysUntilDeadline = (dateStr) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'EXPIRED', class: 'expired' };
    if (diffDays === 0) return { text: 'TODAY', class: 'today' };
    if (diffDays === 1) return { text: 'TOMORROW', class: 'tomorrow' };
    if (diffDays <= 10) return { text: `${diffDays} DAYS`, class: 'urgent' };
    if (diffDays <= 40) return { text: `${diffDays} DAYS`, class: 'soon' };
    return { text: `${diffDays} DAYS`, class: 'normal' };
  };

  // Separate active and expired conferences
  const activeConferences = conferences.filter(conf => {
    const daysInfo = getDaysUntilDeadline(conf.cfpEnds);
    return daysInfo.class !== 'expired';
  });

  const expiredConferences = conferences.filter(conf => {
    const daysInfo = getDaysUntilDeadline(conf.cfpEnds);
    return daysInfo.class === 'expired';
  });

  const displayedConferences = showExpired 
    ? [...activeConferences, ...expiredConferences]
    : activeConferences;

  return (
    <div className="App">
      <div className="terminal">
        <div className="header">
          <div className="ascii-art">
            <div className="ascii-logo">
              <span className="ascii-text">░█▀▀░█▀▀░█▀█░░░▀█▀░▀█▀░█▄█░█▀▀</span>
              <span className="ascii-text">░█░░░█▀▀░█▀▀░░░░█░░░█░░█░█░█▀▀</span>
              <span className="ascii-text">░▀▀▀░▀░░░▀░░░░░░▀░░▀▀▀░▀░▀░▀▀▀</span>
            </div>
            <div className="subtitle">CYBERSECURITY CONFERENCE DEADLINES</div>
          </div>
          <div className="system-info">
            <span className="prompt">[SYSTEM]</span> TRACKING {activeConferences.length} ACTIVE / {expiredConferences.length} CLOSED
            {lastUpdated && (
              <span className="timestamp"> | LAST SYNC: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <span className="blink">LOADING DATABASE...</span>
          </div>
        ) : error ? (
          <div className="error">
            <span className="prompt">[ERROR]</span> {error}
          </div>
        ) : (
          <div className="table-container">
            <table className="conference-table">
              <thead>
                <tr>
                  <th>CONFERENCE</th>
                  <th>CFP DEADLINE</th>
                  <th>STATUS</th>
                  <th>CONFERENCE DATE</th>
                  <th>LOCATION</th>
                  <th>SUBMIT</th>
                </tr>
              </thead>
              <tbody>
                {displayedConferences.map((conf, index) => {
                  const daysInfo = getDaysUntilDeadline(conf.cfpEnds);
                  return (
                    <tr key={index} className={daysInfo.class}>
                      <td>
                        {conf.url ? (
                          <a href={conf.url} target="_blank" rel="noopener noreferrer">
                            {conf.name}
                          </a>
                        ) : (
                          conf.name
                        )}
                      </td>
                      <td>{conf.cfpEnds}</td>
                      <td className={`status ${daysInfo.class}`}>
                        <span className="status-badge">{daysInfo.text}</span>
                      </td>
                      <td>{conf.conferenceDate}</td>
                      <td>{conf.location}</td>
                      <td>
                        {conf.cfpLinkUrl ? (
                          <a href={conf.cfpLinkUrl} target="_blank" rel="noopener noreferrer" className="cfp-link">
                            [{conf.cfpLinkText}]
                          </a>
                        ) : (
                          conf.cfpLinkText
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {expiredConferences.length > 0 && (
              <div className="expired-toggle">
                <button 
                  className="toggle-button"
                  onClick={() => setShowExpired(!showExpired)}
                >
                  <span className="prompt">$</span> {showExpired ? 'HIDE' : 'SHOW'} {expiredConferences.length} CLOSED CFP{expiredConferences.length > 1 ? 'S' : ''}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="footer">
          <div className="footer-text">
            <span className="prompt">$</span> CONTRIBUTE ON GITHUB: <a 
              href="https://github.com/Astarte-Security/cfp-time/blob/main/README.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              EDIT README.MD
            </a> TO UPDATE THIS SITE
          </div>
          <div className="scanlines"></div>
        </div>
      </div>
    </div>
  );
}

export default App;