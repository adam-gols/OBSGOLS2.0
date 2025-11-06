# Implementation Plan

## 1. Overview

### Project Purpose
Develop a production-ready OBS Studio widget for Game On Live Studio that provides seamless integration between Google Sheets game data, OBS recording controls, and Singular Live data streaming for youth sports broadcasting workflows.

### Scope
- **Frontend Widget**: TypeScript-based modular OBS Browser Source widget
- **Google Sheets Integration**: Real-time data reading from File Cabinet and Operations sheets
- **OBS Controls**: Recording start/stop with automated file naming
- **Singular Live Integration**: Real-time data streaming to broadcast graphics
- **Configuration Management**: Runtime settings UI for all integrations
- **Error Handling**: Comprehensive resilience without cached fallbacks

### Success Criteria
- Widget loads successfully as OBS Browser Source
- Seamless event and site stream selection from Google Sheets data
- Accurate game navigation with real-time Google Sheets updates
- Functional OBS recording controls with proper file naming
- Active Singular Live data streaming when configured
- Clear service status indicators and error handling
- Maintainable modular codebase with extensive debugging

### Assumptions
- OBS Studio with Browser Source capability available
- Google Sheets API access via service account authentication
- Network connectivity for real-time API integrations
- Modern Chromium-based browser engine (CEF) in OBS
- User has necessary credentials for Singular Live integration

## 2. Architecture / System Design

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    OBS Browser Source                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 GOLS Widget                             │ │
│  │                                                         │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │ │
│  │  │   Core UI    │    │ Integrations │    │   Utils   │ │ │
│  │  │              │    │              │    │           │ │ │
│  │  │ • Components │    │ • Google API │    │ • Logging │ │ │
│  │  │ • Templates  │    │ • OBS Socket │    │ • Validation│ │ │
│  │  │ • Styles     │    │ • Singular   │    │ • Constants│ │ │
│  │  └──────────────┘    └──────────────┘    └───────────┘ │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Event Bus & State Management           │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Google Sheets│    │ OBS WebSocket│    │ Singular Live│
  │     API      │    │     API      │    │   Data API   │
  └──────────────┘    └──────────────┘    └──────────────┘
```

### Data Flow
1. **Initialization**: Widget loads → Settings UI → Service connections
2. **Event Selection**: File Cabinet → Event dropdown → OPS sheet loading
3. **Site Stream Selection**: Site Info processing → Game filtering → Display
4. **Game Navigation**: User interaction → Google Sheets updates → OBS recording
5. **Data Streaming**: Game state changes → Singular Live API updates
6. **Error Handling**: Service failures → Status indicators → State preservation

### Technology Stack
- **Build Tool**: Vite 5.x with TypeScript configuration
- **Language**: TypeScript 5.x with strict mode
- **Modules**: ES6 classes with event-driven architecture
- **Styling**: CSS3 with CSS Variables for Game On Live Studio theming
- **APIs**: Google Sheets API v4, OBS WebSocket 5.x, Singular Live REST API
- **Storage**: LocalStorage for settings persistence

### Integration Points
- **Google Sheets API**: Service account authentication, read/write operations
- **OBS WebSocket**: Recording control, file management, status monitoring
- **Singular Live API**: Data stream endpoints with bearer token authentication
- **Browser APIs**: LocalStorage, Fetch API, WebSocket, Console API

## 3. Step-by-Step Implementation Plan

### Step 1: Project Foundation & Build System Setup
- **Owner:** You (Claude)
- **Goal:** Establish TypeScript + Vite development environment with modular structure
- **Actions (what you will do):**
  - Create Vite TypeScript project configuration
  - Set up modular folder structure (src/core, src/integrations, src/ui, src/data, src/utils, src/tests)
  - Configure TypeScript compiler options for strict mode
  - Set up development and production build scripts
  - Create main entry point and module system
  - Implement extensive console logging system for development
- **Inputs/Dependencies (what you need):**
  - Node.js environment (assumed available)
  - Package.json with Vite and TypeScript dependencies
- **Deliverables (what you will produce):**
  - `package.json` with all dependencies
  - `vite.config.ts` with development configuration
  - `tsconfig.json` with strict TypeScript settings
  - Modular folder structure with index files
  - `src/main.ts` as entry point
  - `src/utils/logger.ts` for comprehensive debugging
- **Testing & Validation Plan (how you will verify it):**
  - `npm install` runs successfully
  - `npm run dev` starts development server
  - `npm run build` creates production bundle
  - TypeScript compilation without errors
  - Module imports resolve correctly
- **Risks & Mitigations:**
  - Risk: TypeScript configuration complexity → Mitigation: Use standard strict configuration
  - Risk: Module resolution issues → Mitigation: Explicit path mapping in tsconfig

### Step 2: Core Widget Controller & Event System
- **Owner:** You (Claude)
- **Goal:** Create central widget controller with event-driven architecture
- **Actions (what you will do):**
  - Implement `WidgetController` class as main orchestrator
  - Create `EventBus` for inter-module communication
  - Set up `SettingsManager` for configuration persistence
  - Implement service health monitoring system
  - Create debug panel for development logging
- **Inputs/Dependencies (what you need):**
  - Step 1 foundation completed
  - TypeScript module system operational
- **Deliverables (what you will produce):**
  - `src/core/widget-controller.ts` - Main widget orchestrator
  - `src/core/event-manager.ts` - Event bus implementation
  - `src/core/settings-manager.ts` - Settings persistence
  - `src/core/service-health.ts` - Health monitoring
  - `src/ui/components/debug-panel.ts` - Development debugging
- **Testing & Validation Plan (how you will verify it):**
  - Widget controller initializes without errors
  - Event bus properly routes messages between modules
  - Settings persist across browser sessions
  - Service health monitoring displays connection states
  - Debug panel shows comprehensive logging output
- **Risks & Mitigations:**
  - Risk: Event bus memory leaks → Mitigation: Proper event listener cleanup
  - Risk: Settings corruption → Mitigation: JSON validation and fallback defaults

### Step 3: Google Sheets Integration Module
- **Owner:** You (Claude)
- **Goal:** Implement production-ready Google Sheets API integration with embedded static credentials for all users
- **Actions (what you will do):**
  - Create `GoogleSheetsAPI` class with embedded static service account credentials
  - Implement `FileCabinetManager` for event list management with hardcoded sheet access
  - Build `OpsSheetManager` for operations sheet processing with write capabilities
  - Create data processors for Site Info and Master Schedule tabs
  - Implement real-time data polling with error handling and circuit breaker
  - Embed production Google service account credentials directly in code (obfuscated)
  - Add automatic sheet permissions validation and setup
- **Inputs/Dependencies (what you need):**
  - Step 2 core system completed
  - Production Google service account credentials (embedded statically)
  - File Cabinet URL and structure specification (hardcoded)
- **Deliverables (what you will produce):**
  - `src/integrations/google-sheets/production-api-client.ts` - Production API client with embedded credentials
  - `src/integrations/google-sheets/file-cabinet-manager.ts` - Event management with static configuration
  - `src/integrations/google-sheets/operations-manager.ts` - Operations sheet handling with write-back
  - `src/data/processors/site-info-processor.ts` - Site Info data processing
  - `src/data/processors/schedule-processor.ts` - Master Schedule processing
  - `src/data/models/` - Complete TypeScript interfaces for all data structures
  - `src/utils/credentials.ts` - Embedded credential management (obfuscated)
- **Testing & Validation Plan (how you will verify it):**
  - Static credentials authenticate successfully without user setup
  - File Cabinet data loads and parses correctly with hardcoded configuration
  - Event selection triggers OPS sheet loading automatically
  - Site Info data processes with correct format transformations
  - Master Schedule games filter by site stream accurately
  - Write operations to OPS sheets function correctly
  - Circuit breaker activates on API failures and recovers automatically
- **Risks & Mitigations:**
  - Risk: Google API rate limits → Mitigation: Request throttling, circuit breaker, and shared quota management
  - Risk: Credential exposure → Mitigation: Base64 obfuscation and production-only credentials with minimal permissions
  - Risk: Sheet permission issues → Mitigation: Automatic validation and clear error messages
  - Risk: Data format changes → Mitigation: Robust parsing with validation and fallback schemas

### Step 4: User Interface Components
- **Owner:** You (Claude)
- **Goal:** Build all UI components with Game On Live Studio branding and responsive design
- **Actions (what you will do):**
  - Create HTML template structure for widget layout
  - Implement event selector dropdown component
  - Build site stream selector with dynamic population
  - Create game navigator with prev/next controls
  - Implement settings panel for all configurations
  - Apply Game On Live Studio color system and typography
  - Add error notification system with user-friendly messages
- **Inputs/Dependencies (what you need):**
  - Step 3 Google Sheets integration completed
  - Game On Live Studio brand guidelines from spec
  - UI component specifications
- **Deliverables (what you will produce):**
  - `src/ui/templates/widget.html` - Main widget template
  - `src/ui/components/event-selector.ts` - Event dropdown component
  - `src/ui/components/site-stream-selector.ts` - Site stream selection
  - `src/ui/components/game-navigator.ts` - Game navigation controls
  - `src/ui/components/settings-panel.ts` - Configuration interface
  - `src/ui/components/error-notifications.ts` - Error display system
  - `src/ui/styles/` - Complete CSS system with brand colors
- **Testing & Validation Plan (how you will verify it):**
  - Widget displays correctly in OBS Browser Source
  - Dropdowns populate with real Google Sheets data
  - Game navigation functions without errors
  - Settings panel saves and loads configurations
  - Error notifications display service status correctly
  - Brand colors and typography match specifications
- **Risks & Mitigations:**
  - Risk: OBS Browser Source compatibility → Mitigation: Test in actual OBS environment
  - Risk: Responsive design issues → Mitigation: Test multiple canvas sizes
  - Risk: Brand guideline compliance → Mitigation: Exact color matching and validation

### Step 5: OBS WebSocket Integration
- **Owner:** You (Claude)
- **Goal:** Implement OBS recording controls with automatic file naming
- **Actions (what you will do):**
  - Create OBS WebSocket client with connection management
  - Implement recording start/stop functionality
  - Build automatic file naming system based on game data
  - Add recording status monitoring and display
  - Create save prompts for game navigation
  - Implement clean exit handling with data preservation
- **Inputs/Dependencies (what you need):**
  - Step 4 UI components completed
  - OBS WebSocket API documentation
  - Game data structure from Google Sheets integration
- **Deliverables (what you will produce):**
  - `src/integrations/obs/obs-websocket.ts` - WebSocket client
  - `src/integrations/obs/recording-manager.ts` - Recording control logic
  - `src/utils/file-naming.ts` - Automatic naming conventions
  - Integration with game navigator for save prompts
  - OBS connection status indicators in UI
- **Testing & Validation Plan (how you will verify it):**
  - OBS WebSocket connection establishes successfully
  - Recording starts/stops respond to user actions
  - File naming follows specified convention exactly
  - Save prompts appear during game navigation
  - Recording status displays accurately in widget
  - Clean exit saves current game data to Google Sheets
- **Risks & Mitigations:**
  - Risk: OBS WebSocket connection failures → Mitigation: Automatic reconnection and status display
  - Risk: File naming conflicts → Mitigation: Timestamp-based uniqueness
  - Risk: Recording state desync → Mitigation: Periodic status polling

### Step 6: Singular Live Data Streaming
- **Owner:** You (Claude)
- **Goal:** Implement real-time data streaming to Singular Live broadcast graphics
- **Actions (what you will do):**
  - Create Singular Live API client with authentication
  - Build complete game data payload structure
  - Implement event-driven data streaming (no polling)
  - Add connection testing and health monitoring
  - Create data validation for payload integrity
  - Implement retry logic with exponential backoff
- **Inputs/Dependencies (what you need):**
  - Step 5 OBS integration completed
  - Singular Live API endpoint and authentication token (user to provide)
  - Complete game data structure from navigation system
- **Deliverables (what you will produce):**
  - `src/integrations/singular-live/api-client.ts` - API communication
  - `src/integrations/singular-live/data-stream.ts` - Payload building and streaming
  - `src/data/processors/game-data-processor.ts` - Data transformation for streaming
  - Integration with game navigation for automatic updates
  - Singular Live connection status in settings panel
- **Testing & Validation Plan (how you will verify it):**
  - Singular Live API authentication succeeds
  - Complete game data payload validates correctly
  - Data streams on game navigation events
  - Connection health monitoring works accurately
  - Retry logic handles temporary failures appropriately
  - No data streaming when Singular Live is disabled/disconnected
- **Risks & Mitigations:**
  - Risk: API authentication failures → Mitigation: Clear error messages and token validation
  - Risk: Payload format changes → Mitigation: Versioned data structure with validation
  - Risk: Network connectivity issues → Mitigation: Circuit breaker and status indicators

### Step 7: Game Navigation & Data Management
- **Owner:** You (Claude)
- **Goal:** Complete game navigation system with Google Sheets write-back functionality
- **Actions (what you will do):**
  - Implement chronological game sorting and filtering
  - Create next/previous game navigation with save prompts
  - Build automatic start time calculation (scheduled - 5 minutes)
  - Implement Google Sheets write-back for actual start times
  - Add editable team name functionality with data preservation
  - Create real-time score display from Master Schedule
- **Inputs/Dependencies (what you need):**
  - Step 6 Singular Live integration completed
  - Complete Google Sheets read/write functionality
  - Game data models and processing systems
- **Deliverables (what you will produce):**
  - Enhanced `src/ui/components/game-navigator.ts` with full functionality
  - `src/data/processors/game-navigation.ts` - Navigation logic
  - Google Sheets write operations for actual start times
  - Team name editing with validation
  - Real-time score updates integration
- **Testing & Validation Plan (how you will verify it):**
  - Games sort chronologically by scheduled time
  - Navigation advances through games correctly
  - Save prompts capture actual start times accurately
  - Google Sheets updates reflect in "ACTUAL START TIME" column
  - Team name edits preserve while maintaining data integrity
  - Score updates display in real-time from sheet changes
- **Risks & Mitigations:**
  - Risk: Google Sheets write conflicts → Mitigation: Atomic updates with error handling
  - Risk: Navigation state corruption → Mitigation: State validation and recovery
  - Risk: Time calculation errors → Mitigation: Robust date/time parsing and validation

### Step 8: Error Handling & Service Resilience
- **Owner:** You (Claude)
- **Goal:** Implement comprehensive error handling with state preservation (no cached fallbacks)
- **Actions (what you will do):**
  - Create circuit breaker patterns for all external services
  - Implement service health monitoring with visual indicators
  - Build error notification system with recovery guidance
  - Add automatic retry logic with exponential backoff
  - Create graceful degradation that preserves current state
  - Implement connection recovery workflows
- **Inputs/Dependencies (what you need):**
  - Step 7 game navigation completed
  - All service integrations functional
  - Complete understanding of failure scenarios
- **Deliverables (what you will produce):**
  - `src/utils/circuit-breaker.ts` - Circuit breaker implementation
  - `src/utils/retry-logic.ts` - Exponential backoff retry system
  - Enhanced error notifications with recovery steps
  - Service health dashboard in settings panel
  - Connection recovery automation
- **Testing & Validation Plan (how you will verify it):**
  - Circuit breakers activate on repeated service failures
  - Widget maintains current state during service outages
  - Error messages provide clear guidance for resolution
  - Automatic retries succeed when services recover
  - No cached or dummy data ever displays during failures
  - Service health indicators accurately reflect connection status
- **Risks & Mitigations:**
  - Risk: Cascading failures across services → Mitigation: Isolated circuit breakers per service
  - Risk: Infinite retry loops → Mitigation: Maximum retry limits with backoff
  - Risk: User confusion during outages → Mitigation: Clear status messaging

### Step 9: Production Build & Optimization
- **Owner:** You (Claude)
- **Goal:** Create optimized production build with debugging stripped and performance tuned
- **Actions (what you will do):**
  - Configure Vite production build settings
  - Implement conditional debugging (development only)
  - Optimize bundle size and loading performance
  - Add source maps for production debugging
  - Create deployment package with documentation
  - Implement URL parameter configuration for OBS
- **Inputs/Dependencies (what you need):**
  - Step 8 error handling completed
  - All functionality tested and validated
  - Performance requirements understood
- **Deliverables (what you will produce):**
  - Optimized `vite.config.ts` for production builds
  - Conditional logging system (dev/prod modes)
  - Minified production bundle
  - Deployment documentation and instructions
  - URL parameter configuration system
  - Performance monitoring and metrics
- **Testing & Validation Plan (how you will verify it):**
  - Production build creates optimized bundle
  - No development logging in production mode
  - Widget loads quickly in OBS Browser Source
  - URL parameters configure widget settings correctly
  - Memory usage remains stable during extended operation
  - All functionality works identically in production build
- **Risks & Mitigations:**
  - Risk: Production build breaks functionality → Mitigation: Comprehensive testing in production mode
  - Risk: Performance regression → Mitigation: Performance monitoring and optimization
  - Risk: Configuration complexity → Mitigation: Clear documentation and examples

### Step 10: Documentation & Deployment Package
- **Owner:** You (Claude)
- **Goal:** Create comprehensive documentation and deployment package for end users
- **Actions (what you will do):**
  - Write user installation and configuration guide
  - Create technical documentation for developers
  - Build troubleshooting guide with common issues
  - Create OBS Browser Source setup instructions
  - Document all API configurations and requirements
  - Provide example configurations and test scenarios
- **Inputs/Dependencies (what you need):**
  - Step 9 production build completed
  - All features tested and validated
  - User workflow understanding
- **Deliverables (what you will produce):**
  - `README.md` - Complete user guide
  - `TECHNICAL_DOCS.md` - Developer documentation
  - `TROUBLESHOOTING.md` - Common issues and solutions
  - `OBS_SETUP.md` - OBS Browser Source configuration
  - `API_CONFIGURATION.md` - Service setup instructions
  - Example configuration files and test data
- **Testing & Validation Plan (how you will verify it):**
  - Documentation accurately describes all features
  - Installation instructions work on fresh systems
  - Troubleshooting guide addresses common scenarios
  - OBS setup instructions are clear and complete
  - API configuration examples work correctly
  - All code examples in documentation function properly
- **Risks & Mitigations:**
  - Risk: Documentation becomes outdated → Mitigation: Version-controlled docs with implementation
  - Risk: Missing edge cases → Mitigation: Comprehensive testing scenarios
  - Risk: User confusion → Mitigation: Step-by-step guides with screenshots

## 4. Testing & Validation Strategy

### Unit Testing
- **Test Framework**: Vitest (Vite-native testing)
- **Coverage Target**: 80%+ for core business logic
- **Test Files**: `src/tests/unit/` with `.test.ts` files for each module
- **Mock Strategy**: Mock external APIs (Google Sheets, OBS, Singular Live)
- **Validation**: Data processing, error handling, state management

### Integration Testing
- **API Integration**: Test Google Sheets, OBS WebSocket, Singular Live connections
- **End-to-End Workflows**: Complete user journeys from event selection to data streaming
- **Cross-Service Communication**: Event bus message routing and service coordination
- **Error Scenarios**: Service failures, network issues, authentication problems
- **Browser Compatibility**: Chromium/CEF-specific functionality testing

### System Verification
- **OBS Browser Source**: Widget loading and functionality within OBS Studio
- **Performance Testing**: Memory usage, CPU impact, animation smoothness (60fps)
- **Real Data Testing**: Live Google Sheets data, actual OBS recording, Singular Live streaming
- **User Acceptance**: Complete workflows with real broadcast scenarios
- **Stress Testing**: Extended operation, multiple service connections, error recovery

### Automated Validation
- **Build Pipeline**: Automated testing on code changes
- **TypeScript Compilation**: Strict type checking and error prevention
- **Code Quality**: ESLint for code standards and consistency
- **Bundle Analysis**: Size optimization and dependency management

## 5. Milestones & Timeline

| Phase | Milestone | Deliverables | Dependencies | Estimated Duration |
|-------|-----------|--------------|--------------|-------------------|
| Foundation | Development Environment Ready | Vite + TypeScript setup, modular structure | Node.js environment | 2 hours |
| Core System | Widget Controller & Event Bus | Core orchestration, settings management | Foundation complete | 3 hours |
| Data Integration | Google Sheets Connectivity | API client, data processors, models | Core system, service credentials | 4 hours |
| User Interface | Complete UI Components | All widgets, styling, interactions | Data integration, brand guidelines | 4 hours |
| OBS Integration | Recording Controls | WebSocket client, file management | UI components, OBS available | 3 hours |
| External Streaming | Singular Live Integration | Data streaming, payload building | OBS integration, API credentials | 3 hours |
| Navigation System | Game Management | Navigation, write-back, team editing | All integrations complete | 3 hours |
| Resilience | Error Handling & Recovery | Circuit breakers, health monitoring | All core functionality | 4 hours |
| Production | Optimized Build | Production bundle, performance tuning | All features complete | 2 hours |
| Documentation | User & Developer Guides | Complete documentation package | Production build ready | 3 hours |

**Total Estimated Duration: 31 hours**

## 6. Risks, Assumptions, and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google Sheets API rate limits | Medium | High | Circuit breaker, request throttling, clear error messages |
| OBS WebSocket compatibility issues | Low | High | Test in actual OBS environment, fallback to manual controls |
| Singular Live API changes | Medium | Medium | Versioned payload structure, validation, graceful degradation |
| Browser/CEF compatibility problems | Low | High | Target Chromium-specific features, comprehensive testing |
| Authentication failures | Medium | High | Clear error messages, token validation, recovery workflows |
| Performance degradation in OBS | Medium | High | Optimize bundle size, monitor memory usage, 60fps target |
| Service connectivity issues | High | Medium | Circuit breakers, health monitoring, state preservation |
| User configuration complexity | Medium | Low | Comprehensive documentation, example configurations |
| TypeScript compilation errors | Low | Medium | Strict configuration, comprehensive type definitions |
| Data format inconsistencies | Medium | Medium | Robust parsing, validation, error handling |

## 7. Next Steps & Open Questions

### Required User Inputs
1. **Production Google Service Account**: Static credentials embedded in code for all users
   - **Default Recommendation**: Use embedded production credentials with read/write access to designated sheets
2. **Singular Live Configuration**: API endpoint URL and private token
   - **Default Recommendation**: Build integration with disabled state, enable when configured
3. **File Cabinet URL**: Hardcoded production sheet URL with automatic access
   - **Default Recommendation**: Use embedded production File Cabinet URL with static credentials

### Configuration Decisions
1. **Debug Logging Level**: Verbose console output for development
   - **Default Recommendation**: Maximum debugging enabled for development builds
2. **Service Health Check Frequency**: How often to monitor service connections
   - **Default Recommendation**: 30-second intervals for health checks
3. **OBS WebSocket Host/Port**: Default connection parameters
   - **Default Recommendation**: localhost:4455 (OBS WebSocket default)

### Technical Clarifications
1. **Error Message Detail Level**: How verbose should user-facing error messages be?
   - **Default Recommendation**: Technical details for debugging, user-friendly summaries
2. **Retry Attempt Limits**: Maximum retries before circuit breaker activation
   - **Default Recommendation**: 3 attempts with exponential backoff
3. **Session Persistence Scope**: What settings/state to remember between sessions
   - **Default Recommendation**: All user preferences, last selected event/site stream

**I am ready to begin implementation immediately upon your approval. All default recommendations allow work to continue while awaiting your specific preferences.**
