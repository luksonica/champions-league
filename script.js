/* ============================================
   1. Constants & DOM Elements
============================================ */
const images = document.querySelectorAll('.image-gallery img');
const screens = document.querySelectorAll('.screen-gallery img');
const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');
const matchForm = document.getElementById('matchForm');
let currentSortColumn = null;
let isAscending = true;
const matchDayContainer = document.querySelector('.match-day-container');
let matchDayGenerated = false; // Flag to prevent re-generation
let fixtures = []; // Store generated fixtures globally

/* ============================================
   2. Firebase Configuration & Initialization
============================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAQSPphqNP7BHzbRXLYDwrkUsPyIJpcALc",
  authDomain: "nekro-league-9e7bf.firebaseapp.com",
  projectId: "nekro-league-9e7bf",
  storageBucket: "nekro-league-9e7bf.appspot.com",
  messagingSenderId: "721371342919",
  appId: "1:721371342919:web:217f325dadb42db4a8e962",
  measurementId: "G-0NCFK58SMN"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const analytics = firebase.analytics(app);
console.log("Firebase initialized:", app);

/* ============================================
   3. Utility Functions
============================================ */

// Modal Control
function closeModal() {
  modal.classList.remove('show');
}

// Toggle Gallery Display
function toggleGallery(logo) {
  const gallery = logo.nextElementSibling;
  if (gallery.classList.contains('show')) {
    gallery.classList.remove('show');
  } else {
    gallery.classList.add('show');
  }
}

// Enhanced Sorting Functionality for League Table
function sortTable(columnIndex, dataType) {
  const table = document.getElementById('leagueTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  const teamRows = rows.filter(row => !row.classList.contains('separator'));
  const separatorRows = rows.filter(row => row.classList.contains('separator'));

  // Toggle sort order if the same column is clicked again
  if (currentSortColumn === columnIndex) {
    isAscending = !isAscending;
  } else {
    currentSortColumn = columnIndex;
    isAscending = true;
  }

  teamRows.sort((a, b) => {
    const aPoints = parseInt(a.cells[7].querySelector('.points').textContent);
    const bPoints = parseInt(b.cells[7].querySelector('.points').textContent);

    // Primary sort: points
    if (aPoints !== bPoints) {
      return isAscending ? bPoints - aPoints : aPoints - bPoints;
    }

    // Secondary sort: selected column based on data type
    const aCell = a.cells[columnIndex];
    const bCell = b.cells[columnIndex];
    let aValue, bValue;

    switch (dataType) {
      case 'number':
        aValue = parseInt(aCell.textContent);
        bValue = parseInt(bCell.textContent);
        break;
      case 'string':
        aValue = aCell.textContent.trim().toLowerCase();
        bValue = bCell.textContent.trim().toLowerCase();
        break;
      case 'goals':
        const aGoals = aCell.textContent.split(':').map(Number);
        const bGoals = bCell.textContent.split(':').map(Number);
        aValue = aGoals[0] - aGoals[1];
        bValue = bGoals[0] - bGoals[1];
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return isAscending ? -1 : 1;
    if (aValue > bValue) return isAscending ? 1 : -1;
    return 0;
  });

  // Rebuild the table with updated rows and positions
  tbody.innerHTML = '';
  let teamIndex = 0;
  rows.forEach((row) => {
    if (row.classList.contains('separator')) {
      tbody.appendChild(row);
    } else {
      const teamRow = teamRows[teamIndex];
      teamRow.cells[0].textContent = teamIndex + 1; // Update team position
      tbody.appendChild(teamRow);
      teamIndex++;
    }
  });

  // Add visual feedback for sorted column
  const headers = table.querySelectorAll('th');
  headers.forEach((header, index) => {
    if (index === columnIndex) {
      header.setAttribute('data-sort', isAscending ? 'asc' : 'desc');
    } else {
      header.removeAttribute('data-sort');
    }
  });
}

// Update Team Statistics
function updateTeamStats(teamName, goalsFor, goalsAgainst, isWin, isDraw) {
  const rows = document.querySelectorAll('#leagueTable tbody tr:not(.separator)');

  rows.forEach(row => {
    const teamCell = row.cells[1];
    if (teamCell.querySelector('b').textContent === teamName) {
      const cells = row.cells;
      cells[2].textContent = parseInt(cells[2].textContent) + 1; // Played
      cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0); // Won
      cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0); // Draw
      cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0); // Lost

      const [currentFor, currentAgainst] = cells[6].textContent.split(':').map(Number);
      cells[6].textContent = `${currentFor + goalsFor}:${currentAgainst + goalsAgainst}`; // Goal difference

      const points = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);
      cells[7].querySelector('.points').textContent = points; // Update points

      // Update the match form cell with new form box
      const formCell = cells[8];

      // Remove the oldest form box if there are already 5 form boxes
      if (formCell.children.length >= 5) {
        formCell.removeChild(formCell.lastChild);
      }

      // Create and add the new form box
      const formBox = document.createElement('span');
      formBox.className = 'form-box';
      if (isWin) {
        formBox.classList.add('victory');
      } else if (isDraw) {
        formBox.classList.add('draw');
      } else {
        formBox.classList.add('loss');
      }
      formCell.prepend(formBox);
    }
  });
}

// Add Match to Firestore
function addMatch(homeTeam, awayTeam, homeScore, awayScore) {
  return db.collection('matches').add({ // Return the Promise
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homeScore: homeScore,
    awayScore: awayScore,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Fetch and Display Existing Matches
function fetchMatches() {
  return db.collection('matches').orderBy('timestamp', 'desc').get(); // Return the Promise
}

/* ============================================
   4. Event Listeners for Modal & Gallery
============================================ */
// Open modal when any gallery image is clicked
screens.forEach(screen => {
  screen.addEventListener('click', (event) => { // Add event parameter
    modal.classList.add('show');
    modalImage.src = event.target.src; // Use clicked image's src
  });
});

// Close modal when clicking outside the modal image
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

/* ============================================
   5. Event Listener for Match Form Submission
============================================ */
matchForm.addEventListener('submit', function(e) {
  e.preventDefault();

  const homeTeam = document.getElementById('homeTeam').value;
  const awayTeam = document.getElementById('awayTeam').value;
  const homeScore = parseInt(document.getElementById('homeScore').value);
  const awayScore = parseInt(document.getElementById('awayScore').value);

  if (homeTeam === awayTeam) {
    alert('A team cannot play against itself!');
    return;
  }

  this.reset();
  updateAll();

  // Save match to Firestore and update UI
  addMatch(homeTeam, awayTeam, homeScore, awayScore)
    .then(() => {
      console.log('Match added to Firestore');
      const isDraw = homeScore === awayScore;

      updateTeamStats(
        homeTeam,
        homeScore,
        awayScore,
        homeScore > awayScore,
        isDraw
      );
      updateTeamStats(
        awayTeam,
        awayScore,
        homeScore,
        awayScore > homeScore,
        isDraw
      );

      sortTable(7, 'number');
      updateMatchDayResults(homeTeam, awayTeam, homeScore, awayScore);
    })
    .catch(error => console.error("Error adding match:", error));
});

/* ============================================
   6. Player Squad Interaction
============================================ */

// Initialize player interactions
function initPlayerInteractions() {
  // Add click handlers to all player icons
  document.querySelectorAll('.player-icon').forEach(icon => {
    icon.addEventListener('click', function() {
      const playerId = this.getAttribute('data-player');
      const teamContainer = this.closest('.team-squad');
      showPlayerDetails(playerId, teamContainer);
    });
  });

  // Close button for player details
  document.querySelectorAll('.close-details').forEach(btn => {
    btn.addEventListener('click', function() {
      const teamContainer = this.closest('.team-squad');
      closePlayerDetails(teamContainer);
    });
  });

  // Close when clicking outside player details
  document.querySelectorAll('.player-details-container').forEach(container => {
    container.addEventListener('click', function(e) {
      if (e.target === this) {
        const teamContainer = this.closest('.team-squad');
        closePlayerDetails(teamContainer);
      }
    });
  });
}

function showPlayerDetails(playerId, teamContainer) {
  // Hide all player details in this team first
  teamContainer.querySelectorAll('.player-details').forEach(detail => {
    detail.style.display = 'none';
  });

  // Show the selected player
  const playerDetail = teamContainer.querySelector(`.player-details[data-player="${playerId}"]`);
  if (playerDetail) {
    playerDetail.style.display = 'flex';
    teamContainer.querySelector('.player-details-container').classList.add('active');
  }
}

function closePlayerDetails(teamContainer) {
  teamContainer.querySelector('.player-details-container').classList.remove('active');
}

function updateKnockoutStage() {
  const teams = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)'));

  // Clear existing logos
  document.querySelectorAll('.logos-container div').forEach(div => div.innerHTML = '');

  teams.forEach((team, index) => {
    const position = index + 1;
    const logo = team.querySelector('img').cloneNode(true);
    logo.style.width = '100%';
    logo.style.height = '100%';
    logo.style.objectFit = 'cover';

    let targetSelector;
    if (position <= 8) targetSelector = `.r16-team.pos${position}`;
    else if (position <= 16) targetSelector = `.playoff-seeded.pos${position}`;
    else if (position <= 24) targetSelector = `.playoff-unseeded.pos${position}`;

    if (targetSelector) {
      const container = document.querySelector(targetSelector);
      if (container) container.appendChild(logo);
    }
  });
}

// Call this after any table update
function updateAll() {
  sortTable(7, 'number');
  updateKnockoutStage();
}

// Function to generate and display match day fixtures
function generateMatchDay() {
  if (matchDayGenerated) return; // Only generate once

  const teams = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)')).map(row => row.cells[1].querySelector('b').textContent);
  fixtures = [];

  // Basic Round-Robin Scheduling (8 days)
  for (let day = 1; day <= 8; day++) {
    const dayFixtures = [];
    let matchIndex = 0;
    for (let i = 0; i < teams.length; i += 2) {
      if (day % 2 === 0) {
        if (i + 1 < teams.length) {
          dayFixtures.push({ home: teams[i], away: teams[i + 1], day: day, matchIndex: matchIndex });
        }
      } else {
        if (i + 1 < teams.length) {
          dayFixtures.push({ home: teams[i + 1], away: teams[i], day: day, matchIndex: matchIndex });
        }
      }
      matchIndex++;
    }
    fixtures.push(dayFixtures);
    // Rotate teams for the next day (except the first team)
    teams.splice(1, 0, teams.pop());
  }

  // Display fixtures
  let matchDayHTML = '';
  fixtures.forEach((dayFixtures, index) => {
    matchDayHTML += `
            <div class="match-day-card">
                <h3>Day ${index + 1}</h3>
        `;
    dayFixtures.forEach(match => {
      matchDayHTML += `
                <div class="match-card" data-home="${match.home}" data-away="${match.away}" data-day="${match.day}" data-match-index="${match.matchIndex}">
                    ${match.home} vs ${match.away}
                    <div class="match-result">- / -</div>
                </div>
            `;
    });
    matchDayHTML += '</div>';
  });

  matchDayContainer.innerHTML = matchDayHTML;
  matchDayGenerated = true;
}

// Update match results in the Match Day section
function updateMatchDayResults(homeTeam, awayTeam, homeScore, awayScore) {
  const matchCards = document.querySelectorAll('.match-card');
  matchCards.forEach(card => {
    if ((card.dataset.home === homeTeam && card.dataset.away === awayTeam) ||
      (card.dataset.home === awayTeam && card.dataset.away === homeTeam)) { // Handle both home/away scenarios
      card.querySelector('.match-result').textContent = `${homeScore} / ${awayScore}`;
    }
  });
}

function loadMatchDayResults() {
  fetchMatches()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const match = doc.data();
        updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
      });
    })
    .catch(error => console.error("Error fetching matches for Match Day:", error));
}

window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  fetchMatches()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const match = doc.data();
        updateTeamStats(
          match.homeTeam,
          match.homeScore,
          match.awayScore,
          match.homeScore > match.awayScore,
          match.homeScore === match.awayScore
        );
        updateTeamStats(
          match.awayTeam,
          match.awayScore,
          match.homeScore,
          match.awayScore > match.homeScore,
          match.homeScore === match.awayScore
        );
      });
      sortTable(7, 'number'); // Sort by points on page load
      generateMatchDay();
      loadMatchDayResults(); // Load results into Match Day
      initPlayerInteractions();
      updateKnockoutStage();
      initTeamLogoInteractions(); // Add this line
    })
    .catch(error => console.error("Error fetching initial data:", error));
};

function initTeamLogoInteractions() {
  document.querySelectorAll('#leagueTable tbody td img').forEach(logo => {
    logo.addEventListener('click', function() {
      const teamName = this.closest('td').querySelector('b').textContent;
      const formattedName = teamName.toLowerCase().replace(/ /g, '-');
      const gameplanPath = `images/gameplans/${formattedName}.jpg`;
      
      modalImage.src = gameplanPath;
      modal.classList.add('show');
    });
  });
}

/* Add this at the top of your script.js */
// Navigation functionality
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pageSections = document.querySelectorAll('.page-section');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and sections
      navButtons.forEach(btn => btn.classList.remove('active'));
      pageSections.forEach(section => section.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Show corresponding section
      const pageId = button.dataset.page;
      document.getElementById(`${pageId}-section`).classList.add('active');
      
      // Special handling for each page if needed
      if (pageId === 'matches' && !matchDayGenerated) {
        generateMatchDay();
      }
      if (pageId === 'knockout') {
        updateKnockoutStage();
      }
    });
  });
}

// Modify the window.onload function to include setupNavigation
window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  setupNavigation(); // Initialize navigation
  
  fetchMatches()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const match = doc.data();
        updateTeamStats(
          match.homeTeam,
          match.homeScore,
          match.awayScore,
          match.homeScore > match.awayScore,
          match.homeScore === match.awayScore
        );
        updateTeamStats(
          match.awayTeam,
          match.awayScore,
          match.homeScore,
          match.awayScore > match.homeScore,
          match.homeScore === match.awayScore
        );
      });
      sortTable(7, 'number');
      generateMatchDay();
      loadMatchDayResults();
      initPlayerInteractions();
      updateKnockoutStage();
      initTeamLogoInteractions();
    })
    .catch(error => console.error("Error fetching initial data:", error));
};
