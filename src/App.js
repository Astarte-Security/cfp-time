import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './App.css';

function App() {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showExpired, setShowExpired] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Initialize theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
    
    fetchReadmeData();
    const interval = setInterval(fetchReadmeData, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Retro terminal color animation for light mode
    if (theme === 'light') {
      const asciiTexts = document.querySelectorAll('.ascii-text');
      
      // Wrap each character in a span for individual control
      asciiTexts.forEach(textElement => {
        const text = textElement.textContent;
        textElement.innerHTML = text.split('').map(char => 
          char === ' ' ? char : `<span class="retro-char">${char}</span>`
        ).join('');
      });
      
      const allChars = document.querySelectorAll('.ascii-text .retro-char');
      
      const retroInterval = setInterval(() => {
        // Clear all existing pulse effects
        allChars.forEach(char => {
          char.classList.remove('pulse-active');
        });
        
        // Randomly highlight 1-2 characters with pulse effect
        const numHighlights = 1 + Math.floor(Math.random() * 2);
        const selectedIndices = new Set();
        
        while (selectedIndices.size < numHighlights && selectedIndices.size < allChars.length) {
          selectedIndices.add(Math.floor(Math.random() * allChars.length));
        }
        
        selectedIndices.forEach(index => {
          allChars[index].classList.add('pulse-active');
        });
      }, 2400); // Change every 2400ms
      
      return () => {
        clearInterval(retroInterval);
        // Restore original text
        asciiTexts.forEach(textElement => {
          const text = textElement.textContent;
          textElement.textContent = text;
        });
      };
    }
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

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
          
          // Parse labels if present (format: [label1,label2])
          const labelsMatch = parts[5] ? parts[5].match(/\[([^\]]+)\]/) : null;
          const labels = labelsMatch ? labelsMatch[1].split(',').map(l => l.trim()) : [];
          
          tableData.push({
            name: conferenceName,
            url: conferenceUrl,
            cfpEnds: parts[1].trim(),
            conferenceDate: parts[2].trim(),
            location: parts[3].trim(),
            cfpLinkText: cfpLinkText,
            cfpLinkUrl: cfpLinkUrl,
            labels: labels
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

  // Get all unique labels from conferences with custom ordering
  const labelOrder = ['US', 'EU', 'ASIA', 'REMOTE', 'EASTCOAST', 'MIDWEST', 'WESTCOAST', 'BSIDES', 'COMMERCIAL', 'COMMUNITY', 'SPECIALIZED'];
  const uniqueLabels = [...new Set(conferences.flatMap(conf => conf.labels || []))];
  const allLabels = uniqueLabels.sort((a, b) => {
    const aIndex = labelOrder.indexOf(a.toUpperCase());
    const bIndex = labelOrder.indexOf(b.toUpperCase());
    
    // If both are in the custom order, sort by that order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only a is in custom order, it comes first
    if (aIndex !== -1) return -1;
    // If only b is in custom order, it comes first
    if (bIndex !== -1) return 1;
    // If neither are in custom order, sort alphabetically
    return a.localeCompare(b);
  });

  // Count conferences for each label
  const labelCounts = {};
  allLabels.forEach(label => {
    labelCounts[label] = conferences.filter(conf => 
      conf.labels && conf.labels.includes(label) && 
      getDaysUntilDeadline(conf.cfpEnds).class !== 'expired'
    ).length;
  });

  // Filter conferences by labels
  const filteredConferences = conferences.filter(conf => {
    if (eventTypeFilter === 'all') return true;
    return conf.labels && conf.labels.includes(eventTypeFilter);
  });

  // Separate active and expired conferences from filtered results
  const activeConferences = filteredConferences.filter(conf => {
    const daysInfo = getDaysUntilDeadline(conf.cfpEnds);
    return daysInfo.class !== 'expired';
  });

  const expiredConferences = filteredConferences.filter(conf => {
    const daysInfo = getDaysUntilDeadline(conf.cfpEnds);
    return daysInfo.class === 'expired';
  });

  const displayedConferences = showExpired 
    ? [...activeConferences, ...expiredConferences]
    : activeConferences;

  return (
    <div className="App">
      {ReactDOM.createPortal(
        <div className="theme-toggle">
          <button 
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => toggleTheme('dark')}
            title="Dark Mode"
          >
            ⏾
          </button>
          <button 
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => toggleTheme('light')}
            title="Light Mode"
          >
            ❂
          </button>
        </div>,
        document.getElementById('theme-toggle-root')
      )}
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
            <div className="system-info">
              <span className="prompt">[SYSTEM]</span> TRACKING {activeConferences.length} ACTIVE / {expiredConferences.length} CLOSED
              {lastUpdated && (
                <span className="timestamp"> | LAST SYNC: {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
            <div className="filter-controls">
              <span className="prompt">[FILTER]</span>
              <button 
                className={`filter-button ${eventTypeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setEventTypeFilter('all')}
              >
                ALL EVENTS <span className="filter-count">{activeConferences.length}</span>
              </button>
              {/* Always visible labels */}
              {allLabels.filter(label => ['US', 'EU', 'ASIA', 'REMOTE'].includes(label.toUpperCase())).map(label => (
                <button 
                  key={label}
                  className={`filter-button ${eventTypeFilter === label ? 'active' : ''}`}
                  onClick={() => setEventTypeFilter(label)}
                >
                  {label.toUpperCase()} <span className="filter-count">{labelCounts[label]}</span>
                </button>
              ))}
              {!showAllFilters && allLabels.filter(label => !['US', 'EU', 'ASIA', 'REMOTE'].includes(label.toUpperCase())).length > 0 && (
                <button 
                  className="filter-button"
                  onClick={() => setShowAllFilters(true)}
                >
                  [ + ] SHOW MORE
                </button>
              )}
              {/* Additional labels when expanded */}
              {showAllFilters && allLabels.filter(label => !['US', 'EU', 'ASIA', 'REMOTE'].includes(label.toUpperCase())).map(label => (
                <button 
                  key={label}
                  className={`filter-button ${eventTypeFilter === label ? 'active' : ''}`}
                  onClick={() => setEventTypeFilter(label)}
                >
                  {label.toUpperCase()} <span className="filter-count">{labelCounts[label]}</span>
                </button>
              ))}
              {showAllFilters && (
                <button 
                  className="filter-button"
                  onClick={() => setShowAllFilters(false)}
                >
                  [ - ]
                </button>
              )}
            </div>
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