/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AgentAnalytics from './pages/AgentAnalytics';
import AgentTransactions from './pages/AgentTransactions';
import AlertSettings from './pages/AlertSettings';
import AssignmentConfig from './pages/AssignmentConfig';
import BuyerPortal from './pages/BuyerPortal';
import CalendarSettings from './pages/CalendarSettings';
import DocuSignSettings from './pages/DocuSignSettings';
import Home from './pages/Home';
import LeadPool from './pages/LeadPool';
import LenderPortal from './pages/LenderPortal';
import MilestoneConfig from './pages/MilestoneConfig';
import PropertySearch from './pages/PropertySearch';
import Reports from './pages/Reports';
import TaskTemplates from './pages/TaskTemplates';
import TerritoryManager from './pages/TerritoryManager';
import Reminders from './pages/Reminders';
import ReminderSettings from './pages/ReminderSettings';
import TeamDeals from './pages/TeamDeals';


export const PAGES = {
    "AgentAnalytics": AgentAnalytics,
    "AgentTransactions": AgentTransactions,
    "AlertSettings": AlertSettings,
    "AssignmentConfig": AssignmentConfig,
    "BuyerPortal": BuyerPortal,
    "CalendarSettings": CalendarSettings,
    "DocuSignSettings": DocuSignSettings,
    "Home": Home,
    "LeadPool": LeadPool,
    "LenderPortal": LenderPortal,
    "MilestoneConfig": MilestoneConfig,
    "PropertySearch": PropertySearch,
    "Reports": Reports,
    "TaskTemplates": TaskTemplates,
    "TerritoryManager": TerritoryManager,
    "Reminders": Reminders,
    "ReminderSettings": ReminderSettings,
    "TeamDeals": TeamDeals,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};