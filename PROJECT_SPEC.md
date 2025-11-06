# Game On Live Studio OBS Widget — Project Specifications

## Overview

An interactive OBS Studio widget designed for sports broadcasting by Game On Live Studio. This widget will be implemented as a Browser Source that can be easily integrated into OBS Studio, providing real-time game data management, Google Sheets integration, and Singular Live data stream integration. The widget targets broadcasters who need seamless integration between game scheduling systems and live streaming production workflows.

## Mission

To create a production-ready OBS Studio widget that seamlessly integrates Google Sheets game data with OBS recording controls and transmiting updates to  Singular Live data streams. The widget enables efficient youth sports broadcasting workflows by automating game navigation, recording management, and real-time data synchronization across multiple platforms.

## Core Requirements

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+) or TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Framework**: Vanilla JS or lightweight framework (React/Vue consideration for complex interactions)
- **Styling**: CSS3 with CSS Variables for theming, CSS Animations/Transitions
- **Browser Compatibility**: Chromium-based (OBS uses CEF - Chromium Embedded Framework)
- **Google Sheets API**: Service account authentication using `service-account.json`
- **OBS WebSocket API**: Integration for recording control and file management
- **Singular Live API**: Real-time data stream integration with configurable endpoints and authentication
- **LocalStorage API**: Persistent settings and session state storage across OBS sessions
- **WebSocket Communication**: Real-time data streaming and OBS integration protocols

### Critical Must-Haves
- **OBS Browser Source Compatibility**: Must work as an OBS Browser Source
- **Google Sheets Integration**: Read data from File Cabinet and Operations sheets
- **Singular Live Data Stream**: Send formatted data to Singular Live via data stream API
- **Real-time Performance**: 60fps animation capability, low CPU/memory usage
- **Transparent Background**: Proper alpha channel support for overlay functionality
- **Responsive Design**: Adaptable to different canvas sizes and resolutions
- **Configuration Interface**: Easy setup and customization options
- **Cross-platform**: Compatible with OBS Studio on Windows, macOS, and Linux
- **Session Persistence**: LocalStorage integration for settings and state preservation across OBS sessions
- **Editable Settings Panel**: User-configurable options for all integrations and preferences

## Features

### Core Features
- **Event Selection Interface**: Dropdown populated dynamically from the File Cabinet events list  
- **Site Stream Selection**: Secondary dropdown for selecting specific site streams from the Site Info tab  
- **Game Filtering & Display**: Filter Master Schedule games by selected site stream (Date + Location)  
- **Game Navigation Controls**: "Next Game" and "Prev Game" buttons with save prompts  
- **Auto-Recording Management**: OBS recording start/stop with automatic file naming conventions  
- **Start Time Automation**: Automatically sets first game start time 5 minutes before scheduled time  
- **Google Sheets Write-Back**: Updates "ACTUAL START TIME" column with live computer time
- **Singular Live Data Streaming**: Real-time current game data sent to configurable Singular Live endpoint
- **Persistent Settings System**: All configurations saved across OBS sessions using localStorage
- **Session Restoration**: Automatic restoration of last selected event and site stream on widget reload  
- **Chronological Game Sorting**: Displays games in time order with accurate row tracking  
- **Editable Team Names**: Allows user-friendly team name editing while preserving data integrity  
- **File Cabinet Integration**: Pulls master event list from the Game On Live Studio File Cabinet sheet  
- **Operations Sheet Loading**: Dynamically loads the selected event’s Operations (OPS) sheet  
- **Site-Specific Data Filtering**: Displays only the data relevant to the selected site stream  
- **Site Info Processing**: Parses and normalizes Site Info data (DATE, CHANNEL, COMPUTER, LOCATION)  
- **Master Schedule Processing**: Handles real-time scheduling and scoring data with team matchups  
- **Live Score Tracking**: Monitors and displays team scores from the Master Schedule tab  
- **Data Transformation**: Intelligently parses channel/computer identifiers and removes leading zeros  
- **Singular Live Integration**: Sends formatted data to the Singular Live Data Stream API  
- **Sports-Focused Simple UI Elements**: Incorporates scoreboard displays, team information, and game timers in a small easy to use space 
- **Real-Time Data Display**: Supports dynamic graphics for scores, stats, and live game events  
- **Game On Live Studio Brand Integration**: Maintains consistent color hierarchy and visual identity  
- **Youth Sports Theming**: Delivers a professional broadcast polish with an energetic, youth-sports feel  
- **Responsive Layout**: Adapts automatically to various canvas sizes and resolutions   
- **Built-in Google Sheets Access**: Pre-configured service account (no user authentication setup)
- **Configurable File Cabinet**: Default File Cabinet URL with settings override option
- **Dynamic OPS Sheet Loading**: Automatically load operations sheet based on event selection
- **Event Persistence**: Remember selected event between sessions using local storage
- **Data Stream Management**: Handle Singular Live private token and API endpoint configuration
- **Real-time Data Sync**: Automatic polling and updates from selected operations sheet
- **Error Handling & Fallbacks**: Graceful handling of API failures and connectivity issues
- **Game On Live Studio Color System**: Full implementation of primary and secondary brand palettes
- **Typography Hierarchy**: Proper Oswald/Roboto font implementation with Game On Live Studio text scales
- **URL Parameter Configuration**: Configure widget settings via OBS Browser Source URL

### Optional Features
- **Live Game Data Integration**: Connect to sports data APIs for real-time scores and stats
- **Team Branding Support**: Customizable team colors and logos within Game On Live Studio brand guidelines
- **Broadcast Quality Overlays**: Professional sports broadcast-style information displays

## Design System & Brand Identity

### Game On Live Studio Brand Colors

#### Primary Palette
| Name | HEX | Usage |
|------|-----|-------|
| **Cardinal Red** | `#C62128` | Main accent; use for CTAs, highlights, and energy points |
| **Black** | `#000000` | Primary text / strong contrast backgrounds |
| **Pumice Grey** | `#C7C9C7` | Secondary text, disabled or tertiary UI elements |
| **Gallery Grey** | `#F0EFEF` | Borders, dividers, or soft background sections |

#### Secondary Palette
| Name | HEX | Usage |
|------|-----|-------|
| **William Green** | `#37605F` | Natural or field-related contexts |
| **Zodiac Blue** | `#0F1C41` | Team-oriented / trustful tone |
| **Picton Blue** | `#4DC7E4` | Friendly accent for highlights where red isn't suitable |

#### Design Principles
- **Foundation**: Build layouts on white or light-grey foundations
- **Cardinal Red Usage**: Use sparingly to focus attention or signal hierarchy
- **Secondary Colors**: Optional colors that should never compete with red—serve for data visualization, sport differentiation, or mood variety
- **Accessibility**: Ensure sufficient contrast ratios for OBS streaming environments
- **Consistency**: Maintain brand identity across all UI elements and states

### Typography & Layout
- **Primary Font**: Clean, readable sans-serif optimized for streaming resolution
- **Hierarchy**: Use Cardinal Red for primary actions and critical information
- **Spacing**: Generous whitespace for clarity in live streaming contexts
- **Interactive Elements**: Cardinal Red for buttons, links, and active states
- **Status Indicators**: Use secondary palette for connection states and data visualization

## Widget Workflow

### Initial Setup Process
1. **Widget Load**: Widget initializes with Game On Live Studio branding and loads File Cabinet sheet
2. **Event Selection**: User presented with dropdown of available events from File Cabinet
3. **Event Choice**: User selects an event (e.g., "2025 Rocktober")
4. **OPS Sheet Loading**: Widget automatically loads the corresponding operations sheet
5. **Site Stream Selection**: Second dropdown appears with "Select a Site Stream" populated from Site Info tab
6. **Site Stream Choice**: User selects site stream in format "Date | Location | Computer" (e.g., "10/10/2025 | Kino AC 1 | GD8")
7. **Data Display**: Widget begins displaying live data filtered for the selected site stream

### File Cabinet Structure
**Default File Cabinet URL**: https://docs.google.com/spreadsheets/d/1yIMVWLxVRwsTnUlRNuIKIhesgrL9rvTZheq7-U-zNM0/edit?usp=sharing

```
Column A (EVENT)          | Column B (OPS SHEET LINK)
--------------------------|------------------------------------------
2025 Rocktober           | https://docs.google.com/spreadsheets/d/1J4Vg2rjbWXc8XsFDuxFQI0mdRT1Nr3QkT1_ULEh2bQo/edit?usp=sharing
Winter Championship      | https://docs.google.com/spreadsheets/d/1ABC123...
Spring Tournament        | https://docs.google.com/spreadsheets/d/1XYZ789...
```

### User Experience Flow
- **First Launch**: Event selection dropdown appears prominently
- **Event Selection**: Dropdown populated from File Cabinet Column A (EVENT)
- **Auto-Loading**: Selected event's OPS sheet (Column B) loads automatically
- **Site Stream Selection**: Second dropdown appears after event selection
- **Site Stream Options**: Populated from Site Info tab in format "Date | Location | Computer"
- **Data Filtering**: Widget displays data specific to selected site stream
- **Settings Access**: File Cabinet URL configurable via settings panel (default protected)
- **Session Memory**: Last selected event and site stream remembered for subsequent loads
- **Error Handling**: Fallback options if File Cabinet or OPS sheet unavailable

### Data Flow
```
File Cabinet Sheet → Event List → User Selection → OPS Sheet → Site Info → Site Stream Selection → Filtered Data Display → Singular Live
```

## OPS Sheet Structure

### Standardized Tabs
Operations Sheets contain multiple standardized tabs that the widget will access for different types of data. These tabs have consistent structures across all events.

### Site Info Tab
The Site Info tab contains location and technical setup information for streaming sites.

#### Complete Column Structure
| Column | Name | Description | Processing Rule |
|--------|------|-------------|-----------------|
| A | DATE | Event date | Store as-is |
| B | CHANNEL | Channel identifier | Extract number from "CH##" format |
| C | COMPUTER | Computer identifier | Extract number from "GD##", remove leading zeros |
| D | LOCATION | Venue location | Case-sensitive, store exactly as provided |
| E | SINGULAR | Singular Live control URL | Optional, store as-is |
| F | Division | Event division | Optional |
| G | STAFF | Staff member name | Optional |
| H | 1st Game Start | First game start time | Optional |
| I | Last Game End | Last game end time | Optional |
| J | Site Map | Map information | Optional |
| K | Internet? | Internet connectivity type | Optional |
| L | Ethernet Info | Network details | Optional |
| M | WIFI username | WiFi credentials | Optional |
| N | WIFI password | WiFi credentials | Optional |
| O | Jump Available | Jump capability | Optional |
| P | Zixi Ingest | Zixi streaming info | Optional |

#### Example Data Processing
```
Raw Data:
DATE: 10/10/2025
CHANNEL: CH10
COMPUTER: GD08
LOCATION: Kino AC 1

Processed Data:
date: "10/10/2025"
channel: 10
computer: 8
location: "Kino AC 1"
```

#### Data Processing Rules
- **Channel Processing**: `"CH10"` → `10`, `"CH11"` → `11`
- **Computer Processing**: `"GD08"` → `8`, `"GD10"` → `10`, `"GD01"` → `1`
- **Location Preservation**: `"Kino AC 1"` → `"Kino AC 1"` (exact case match)
- **Date Format**: Maintain original date format from sheet

#### Site Stream Selection Format
The Site Stream dropdown uses data from the Site Info tab to create user-friendly selection options:

**Dropdown Format**: `"Date | Location | Computer"`

**Examples**:
- `"10/10/2025 | Kino AC 1 | GD8"` (from DATE: 10/10/2025, LOCATION: Kino AC 1, COMPUTER: GD08)
- `"10/10/2025 | Kino AC 2 | GD10"` (from DATE: 10/10/2025, LOCATION: Kino AC 2, COMPUTER: GD10)
- `"10/11/2025 | Kino AC 1 | GD8"` (from DATE: 10/11/2025, LOCATION: Kino AC 1, COMPUTER: GD08)

**Selection Logic**:
- Each unique combination of Date + Location + Computer creates one dropdown option
- Computer numbers are processed (leading zeros removed) for display
- Location names preserved exactly as stored in Site Info
- Selection determines which site's data to display and stream

### Master Schedule Tab
The Master Schedule tab contains game scheduling and scoring information for the event.

#### Complete Column Structure
| Column | Name | Description | Data Type |
|--------|------|-------------|-----------|
| A | DATE | Game date | Date |
| B | TIME | Scheduled start time | Time |
| C | LOCATION | Venue location | String (case-sensitive) |
| D | GAME# | Game identifier | String/Number |
| E | WHITE | White team name | String |
| F | S | White team score | Number |
| G | DARK | Dark team name | String |
| H | S | Dark team score | Number |
| I | COMMENTS | Game notes/stage | String |
| J | DIVISION | Division category | String |
| K | ACTUAL START TIME | Actual game start time | Time |

#### Example Data Processing
```
Raw Data:
DATE: 10/10/2025
TIME: 7:00:00 AM
LOCATION: Kino AC 1
GAME#: 1101
WHITE: J1- 908 Girls
S (White Score): 4
DARK: J2-  TEXAS MAVS
S (Dark Score): 18
COMMENTS: J Group Play
DIVISION: Rockettes
ACTUAL START TIME: 7:00:00 AM

Processed Data:
{
  date: "10/10/2025",
  scheduledTime: "7:00:00 AM",
  location: "Kino AC 1",
  gameNumber: "1101",
  whiteTeam: {
    name: "J1- 908 Girls",
    score: 4
  },
  darkTeam: {
    name: "J2-  TEXAS MAVS", 
    score: 18
  },
  comments: "J Group Play",
  division: "Rockettes",
  actualStartTime: "7:00:00 AM"
}
```

#### Data Processing Rules
- **DATE/TIME**: Preserve original format from sheet
- **LOCATION**: Case-sensitive, store exactly as provided (matches Site Info location)
- **GAME#**: Store as string to preserve format (e.g., "1101", "1102")
- **Scores**: Convert "S" columns to numeric values (0 if empty/null)
- **Team Names**: Preserve exact spacing and formatting
- **ACTUAL START TIME**: Track variance from scheduled time for analytics

#### Game Filtering and Display Logic
Based on the selected Site Stream (Date + Location), the widget filters and displays relevant games:

**Filtering Process**:
1. **Match Criteria**: Find all Master Schedule rows where DATE and LOCATION match the selected Site Stream
2. **Chronological Sort**: Sort matching games by TIME column (earliest to latest)
3. **Row Position Storage**: Store the original Google Sheets row number for each game (for later updates)
4. **Data Preservation**: Maintain all original row data for complete game information

**Display Format**:
- **Game # & Game Time**: Read-only fields showing GAME# and TIME from Master Schedule
- **Team 1 vs Team 2**: Editable fields initially populated with WHITE vs DARK team names
- **Layout**: User-friendly format showing essential game information

**Example Filtered Display**:
```
Selected Site Stream: "10/10/2025 | Kino AC 1 | 8"

Filtered Games (chronological order):
Game #: 1101    Time: 7:00:00 AM
Team 1: [J1- 908 Girls] vs Team 2: [J2- TEXAS MAVS]
(Row 2 in Google Sheet)

Game #: 1102    Time: 7:50:00 AM  
Team 1: [J3- GREENWICH Girls] vs Team 2: [J4- SLO Girls]
(Row 3 in Google Sheet)

Game #: 1103    Time: 8:40:00 AM
Team 1: [D1- SOCAL] vs Team 2: [D4- MESA A]
(Row 4 in Google Sheet)
```

**Data Structure for Filtered Games**:
```javascript
{
  gameNumber: "1101",           // Read-only (from GAME# column)
  scheduledTime: "7:00:00 AM",  // Read-only (from TIME column)
  team1: "J1- 908 Girls",       // Editable (initially from WHITE column)
  team2: "J2- TEXAS MAVS",      // Editable (initially from DARK column)
  originalRowIndex: 2,          // Google Sheets row number (for updates)
  originalData: {               // Complete original row data
    date: "10/10/2025",
    location: "Kino AC 1",
    whiteScore: 4,
    darkScore: 18,
    comments: "J Group Play",
    division: "Rockettes",
    actualStartTime: "7:00:00 AM"
  }
}
```

**User Interaction**:
- **Game # & Time**: Display-only, cannot be modified by user
- **Team Names**: Editable text fields, changes reflected in widget display
- **Validation**: Ensure team name edits don't break display formatting
- **Real-time Updates**: Score updates from Google Sheets continue to work with edited team names

#### Game Navigation and Recording Logic

**Current Game Display**:
- **Default Display**: First game chronologically is shown initially
- **Navigation Controls**: "Next Game" and "Prev Game" buttons for game switching
- **Auto-Start Time**: First game's start time automatically set to 5 minutes before scheduled time

**Game Navigation Workflow**:
1. **Next Game Button**: User clicks to advance to next chronological game
2. **Save Prompt**: Widget asks "Do you want to save the current game?"
3. **If Yes**: Current computer time written to Google Sheets "ACTUAL START TIME" column for next game's row
4. **Recording Control**: OBS automatically stops recording and saves file
5. **Game Switch**: Display updates to show next game information

**Recording File Naming Convention**:
```
Format: "Date_ComputerNumber_Location_Time_Team1vsTeam2"
Examples:
- "10-10-2025_GD08_Kino AC 1_7-00-00 AM_J1- 908 Girls vs J2- TEXAS MAVS"
- "10-10-2025_GD08_Kino AC 1_7-50-00 AM_J3- GREENWICH Girls vs J4- SLO Girls"
```

**Start Time Logic**:
- **First Game**: When site stream is selected, automatically set start time to scheduled time minus 5 minutes
  - Example: Scheduled 7:00:00 AM → Auto-start at 6:55:00 AM
- **Subsequent Games**: When "Next Game" is confirmed, write current computer time to next game's start time
- **Google Sheets Update**: Write to "ACTUAL START TIME" column (Column K) for appropriate row

**OBS Integration Requirements**:
- **Recording Control**: Widget must interface with OBS to start/stop recordings
- **File Management**: Automatic file naming and saving based on game information
- **Computer Identifier**: Use original "GD##" format in filename (not processed number)

**Exit Handling**:
- **Widget Close**: When user attempts to close widget/OBS
- **Save Prompt**: Ask "Do you want to save the current game?"
- **If Yes**: Write current time to current game's "ACTUAL START TIME"
- **Clean Exit**: Ensure all data is saved before widget closes

**Example Navigation Flow**:
```
1. Site Stream Selected: "10/10/2025 | Kino AC 1 | 8"
   → First game (1101) displayed, start time set to 6:55:00 AM

2. User clicks "Next Game"
   → Prompt: "Save current game?"
   → If Yes: Write current time (7:45:00 AM) to Game 1102's start time
   → Stop recording: "10-10-2025_GD08_Kino AC 1_7-00-00 AM_J1- 908 Girls vs J2- TEXAS MAVS"
   → Display Game 1102

3. User closes widget
   → Prompt: "Save current game?"
   → If Yes: Write current time to Game 1102's start time
   → Clean exit
```

## Singular Live Data Stream Integration

### Current Game Data Stream
The widget continuously sends the currently selected game's data to a configured Singular Live data stream endpoint. This enables real-time integration with broadcast graphics and overlays.

#### Data Stream Configuration
- **Endpoint URL**: Configurable Singular Live data stream API endpoint
- **Private Token**: Secure authentication token for data stream access
- **Update Frequency**: Configurable interval for data updates (default: 5 seconds)
- **Data Format**: JSON payload containing current game information

#### Complete Game Data Payload
```json
{
  "timestamp": "2025-10-23T14:30:00.000Z",
  "currentGame": {
    "gameInfo": {
      "gameNumber": "1101",
      "scheduledTime": "7:00:00 AM",
      "actualStartTime": "6:55:00 AM",
      "location": "Kino AC 1",
      "date": "10/10/2025"
    },
    "teams": {
      "team1": {
        "name": "J1- 908 Girls",
        "score": 4,
        "side": "white"
      },
      "team2": {
        "name": "J2- TEXAS MAVS",
        "score": 18,
        "side": "dark"
      }
    },
    "gameStatus": {
      "isActive": true,
      "period": "1st Quarter",
      "timeRemaining": "05:23",
      "comments": "J Group Play"
    },
    "division": "Rockettes"
  },
  "previousGame": {
    "gameInfo": {
      "gameNumber": "1100",
      "scheduledTime": "6:10:00 AM",
      "actualStartTime": "6:05:00 AM",
      "location": "Kino AC 1",
      "date": "10/10/2025"
    },
    "teams": {
      "team1": {
        "name": "J5- ELITE GOLD",
        "score": 12,
        "side": "white"
      },
      "team2": {
        "name": "J6- TSUNAMI",
        "score": 8,
        "side": "dark"
      }
    },
    "gameStatus": {
      "isActive": false,
      "isComplete": true,
      "comments": "J Group Play"
    },
    "division": "Rockettes"
  },
  "nextGame": {
    "gameInfo": {
      "gameNumber": "1102",
      "scheduledTime": "7:50:00 AM",
      "actualStartTime": null,
      "location": "Kino AC 1",
      "date": "10/10/2025"
    },
    "teams": {
      "team1": {
        "name": "J3- GREENWICH Girls",
        "score": 0,
        "side": "white"
      },
      "team2": {
        "name": "J4- SLO Girls",
        "score": 0,
        "side": "dark"
      }
    },
    "gameStatus": {
      "isActive": false,
      "isComplete": false,
      "comments": "J Group Play"
    },
    "division": "Rockettes"
  },
  "navigationInfo": {
    "currentGameIndex": 1,
    "totalGames": 8,
    "hasPreviousGame": true,
    "hasNextGame": true
  },
  "siteStream": {
    "date": "10/10/2025",
    "location": "Kino AC 1",
    "computer": "GD08",
    "channel": 10
  }
}
```

#### Data Stream Triggers
- **Game Navigation**: When current game changes via "Next Game" or "Previous Game" buttons
- **Team Name Edits**: When user modifies team names for any visible games
- **Game Status Changes**: When actual start times are recorded or game completion status updates
- **Manual Refresh**: When user manually refreshes data or reconnects
- **Event-Driven Updates**: Data sent to Singular Live only when user makes changes (no automatic polling)
- **Score Updates**: When scores change in Google Sheets and user refreshes or navigates

### Singular Live Data Stream API Implementation

```javascript
// Initialize Singular Live data streaming
GOLSWidget.initSingularLive = function() {
  if (!this.settings.singularLive.enabled || !this.settings.singularLive.dataStreamEndpoint) {
    console.log('Singular Live data streaming disabled or not configured');
    return;
  }
  
  this.singularLive = {
    endpoint: this.settings.singularLive.dataStreamEndpoint,
    token: this.settings.singularLive.privateToken,
    updateInterval: this.settings.singularLive.updateInterval,
    isConnected: false,
    intervalId: null
  };
  
  // Test connection
  this.testSingularLiveConnection()
    .then(() => {
      this.startDataStreaming();
    })
    .catch(error => {
      console.error('Singular Live connection failed:', error);
    });
};

// Test Singular Live connection
GOLSWidget.testSingularLiveConnection = function() {
  return fetch(this.singularLive.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.singularLive.token}`
    },
    body: JSON.stringify({ test: true })
  })
  .then(response => {
    if (response.ok) {
      this.singularLive.isConnected = true;
      console.log('Singular Live connection successful');
      return true;
    } else {
      throw new Error(`Connection failed: ${response.status}`);
    }
  });
};

// Initialize data streaming (event-driven, no continuous polling)
GOLSWidget.initDataStreaming = function() {
  // Clear any existing intervals
  if (this.singularLive.intervalId) {
    clearInterval(this.singularLive.intervalId);
    this.singularLive.intervalId = null;
  }
  
  console.log('Singular Live data streaming initialized (event-driven mode)');
  
  // Send initial data if game is already selected
  if (this.getCurrentGame()) {
    this.sendGameData();
  }
};

// Send complete game data (current, previous, and next) to Singular Live
GOLSWidget.sendGameData = function() {
  if (!this.singularLive.isConnected || !this.getCurrentGame()) {
    return;
  }
  
  const payload = this.buildDataStreamPayload();
  
  fetch(this.singularLive.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.singularLive.token}`
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Data stream failed: ${response.status}`);
    }
    console.log('Complete game data (current/previous/next) sent to Singular Live successfully');
  })
  .catch(error => {
    console.error('Failed to send data to Singular Live:', error);
    // Optionally retry or reconnect
  });
};

// Build complete data stream payload with current, previous, and next games
GOLSWidget.buildDataStreamPayload = function() {
  const currentIndex = this.gameNavigation.currentGameIndex;
  const games = this.gameNavigation.games;
  
  const currentGame = games[currentIndex];
  const previousGame = currentIndex > 0 ? games[currentIndex - 1] : null;
  const nextGame = currentIndex < games.length - 1 ? games[currentIndex + 1] : null;
  
  return {
    timestamp: new Date().toISOString(),
    currentGame: this.buildGameData(currentGame, true), // isActive = true for current game
    previousGame: previousGame ? this.buildGameData(previousGame, false, true) : null, // isComplete = true
    nextGame: nextGame ? this.buildGameData(nextGame, false, false) : null, // isComplete = false
    navigationInfo: {
      currentGameIndex: currentIndex,
      totalGames: games.length,
      hasPreviousGame: currentIndex > 0,
      hasNextGame: currentIndex < games.length - 1
    },
    siteStream: {
      date: this.gameNavigation.siteStream.date,
      location: this.gameNavigation.siteStream.location,
      computer: `GD${this.gameNavigation.siteStream.computer.toString().padStart(2, '0')}`,
      channel: this.gameNavigation.siteStream.channel
    }
  };
};

// Build individual game data object
GOLSWidget.buildGameData = function(game, isActive = false, isComplete = false) {
  if (!game) return null;
  
  return {
    gameInfo: {
      gameNumber: game.gameNumber,
      scheduledTime: game.scheduledTime,
      actualStartTime: game.originalData.actualStartTime || null,
      location: game.originalData.location,
      date: game.originalData.date
    },
    teams: {
      team1: {
        name: game.team1 || game.originalData.whiteTeam,
        score: game.originalData.whiteScore || 0,
        side: "white"
      },
      team2: {
        name: game.team2 || game.originalData.darkTeam,
        score: game.originalData.darkScore || 0,
        side: "dark"
      }
    },
    gameStatus: {
      isActive: isActive && (this.gameNavigation.recordingActive || false),
      isComplete: isComplete || (game.originalData.actualStartTime && !isActive),
      period: this.extractPeriodFromComments(game.originalData.comments),
      timeRemaining: isActive ? this.calculateTimeRemaining(game) : null,
      comments: game.originalData.comments || ""
    },
    division: game.originalData.division || ""
  };
};

// Reinitialize Singular Live when settings change
GOLSWidget.reinitializeSingularLive = function() {
  // Stop current streaming
  if (this.singularLive && this.singularLive.intervalId) {
    clearInterval(this.singularLive.intervalId);
  }
  
  // Reinitialize with new settings
  this.initSingularLive();
};

// Update data stream interval
GOLSWidget.updateDataStreamInterval = function(newInterval) {
  if (this.singularLive && this.singularLive.intervalId) {
    this.singularLive.updateInterval = newInterval;
    this.startDataStreaming(); // Restart with new interval
  }
};

// Helper function to extract period information from comments
GOLSWidget.extractPeriodFromComments = function(comments) {
  if (!comments) return null;
  
  // Look for common period indicators
  const periodPatterns = [
    /(\d+)\s*(?:st|nd|rd|th)?\s+(?:quarter|period|qtr)/i,
    /Q(\d+)/i,
    /Period\s+(\d+)/i,
    /Half\s+(\d+)/i
  ];
  
  for (let pattern of periodPatterns) {
    const match = comments.match(pattern);
    if (match) {
      return `${match[1]}${this.getOrdinalSuffix(match[1])} Quarter`;
    }
  }
  
  return comments; // Return original if no pattern matches
};

// Helper function to calculate time remaining (placeholder implementation)
GOLSWidget.calculateTimeRemaining = function(game) {
  // This would typically calculate based on actual start time vs current time
  // and sport-specific game duration rules
  if (!game.originalData.actualStartTime) {
    return null;
  }
  
  // Placeholder calculation - would need sport-specific logic
  const startTime = new Date(`1970/01/01 ${game.originalData.actualStartTime}`);
  const currentTime = new Date();
  const elapsed = currentTime - startTime;
  
  // Example: 20-minute quarters for water polo
  const quarterDurationMs = 20 * 60 * 1000;
  const remaining = quarterDurationMs - (elapsed % quarterDurationMs);
  
  if (remaining > 0) {
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return "00:00";
};

// Helper function to get ordinal suffix
GOLSWidget.getOrdinalSuffix = function(num) {
  const j = num % 10;
  const k = num % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
};

// Enhanced data validation for Singular Live payload
GOLSWidget.validateGameDataPayload = function(payload) {
  const requiredFields = ['timestamp', 'currentGame', 'navigationInfo', 'siteStream'];
  
  for (let field of requiredFields) {
    if (!payload[field]) {
      console.warn(`Missing required field in payload: ${field}`);
      return false;
    }
  }
  
  // Validate current game structure
  if (!payload.currentGame.gameInfo || !payload.currentGame.teams) {
    console.warn('Invalid current game structure in payload');
    return false;
  }
  
  return true;
};

// Send data with validation and error handling
GOLSWidget.sendValidatedGameData = function() {
  if (!this.singularLive.isConnected || !this.getCurrentGame()) {
    return;
  }
  
  const payload = this.buildDataStreamPayload();
  
  // Validate payload before sending
  if (!this.validateGameDataPayload(payload)) {
    console.error('Invalid payload structure, skipping data stream update');
    return;
  }
  
  fetch(this.singularLive.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.singularLive.token}`
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Data stream failed: ${response.status}`);
    }
    console.log('Validated game data sent to Singular Live successfully');
  })
  .catch(error => {
    console.error('Failed to send validated data to Singular Live:', error);
    // Optionally retry or reconnect
  });
};
```

### Error Handling and Caching System

#### Error Notification Implementation
```javascript
// Error notification system
GOLSWidget.showError = function(message, type = 'error', duration = 5000) {
  const errorContainer = document.getElementById('error-notifications');
  const errorElement = document.createElement('div');
  errorElement.className = `error-notification ${type}`;
  errorElement.innerHTML = `
    <span class="error-message">${message}</span>
    <button class="error-retry" onclick="this.parentElement.remove()">×</button>
  `;
  
  errorContainer.appendChild(errorElement);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (errorElement.parentElement) {
      errorElement.remove();
    }
  }, duration);
};

// Retry mechanism for failed operations
GOLSWidget.retryOperation = function(operation, maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount) => {
      operation()
        .then(resolve)
        .catch(error => {
          if (retryCount < maxRetries) {
            setTimeout(() => attempt(retryCount + 1), delay * retryCount);
          } else {
            this.showError(`Operation failed after ${maxRetries} attempts: ${error.message}`);
            reject(error);
          }
        });
    };
    attempt(1);
  });
};
```

#### Data Caching Implementation
```javascript
// Local data caching system
GOLSWidget.cache = {
  fileCabinet: null,
  opsSheets: {},
  lastUpdated: {},
  
  // Cache file cabinet data
  setFileCabinet: function(data) {
    this.fileCabinet = data;
    this.lastUpdated.fileCabinet = Date.now();
    localStorage.setItem('golsCache_fileCabinet', JSON.stringify({
      data: data,
      timestamp: this.lastUpdated.fileCabinet
    }));
  },
  
  // Cache operations sheet data
  setOpsSheet: function(eventName, data) {
    this.opsSheets[eventName] = data;
    this.lastUpdated[eventName] = Date.now();
    localStorage.setItem(`golsCache_ops_${eventName}`, JSON.stringify({
      data: data,
      timestamp: this.lastUpdated[eventName]
    }));
  },
  
  // Get cached data with expiry check (1 hour default)
  get: function(key, maxAge = 3600000) {
    const cached = localStorage.getItem(`golsCache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < maxAge) {
        return data;
      }
    }
    return null;
  },
  
  // Clear expired cache entries
  cleanup: function() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('golsCache_')) {
        const cached = JSON.parse(localStorage.getItem(key));
        if (Date.now() - cached.timestamp > 3600000) {
          localStorage.removeItem(key);
        }
      }
    });
  }
};
```
