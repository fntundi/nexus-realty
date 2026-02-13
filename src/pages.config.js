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
import AgentDashboard from './pages/AgentDashboard';
import AgentPerformanceReport from './pages/AgentPerformanceReport';
import AgentTransactions from './pages/AgentTransactions';
import AlertSettings from './pages/AlertSettings';
import AssignmentConfig from './pages/AssignmentConfig';
import BorrowerDashboard from './pages/BorrowerDashboard';
import BuilderDashboard from './pages/BuilderDashboard';
import BuyerPortal from './pages/BuyerPortal';
import CRMIntegrations from './pages/CRMIntegrations';
import CRMReportingDashboard from './pages/CRMReportingDashboard';
import Calendar from './pages/Calendar';
import CalendarSettings from './pages/CalendarSettings';
import ClientPortal from './pages/ClientPortal';
import ContactDetails from './pages/ContactDetails';
import ContactSegments from './pages/ContactSegments';
import Contacts from './pages/Contacts';
import DeveloperProjectShowcase from './pages/DeveloperProjectShowcase';
import DocuSignSettings from './pages/DocuSignSettings';
import EmailAutomation from './pages/EmailAutomation';
import Home from './pages/Home';
import IDXSettings from './pages/IDXSettings';
import LeadPool from './pages/LeadPool';
import LeadScoringRules from './pages/LeadScoringRules';
import LenderPortal from './pages/LenderPortal';
import MarketDataSettings from './pages/MarketDataSettings';
import MilestoneConfig from './pages/MilestoneConfig';
import NurtureWorkflows from './pages/NurtureWorkflows';
import OnboardingManagement from './pages/OnboardingManagement';
import PersonalizationAndSync from './pages/PersonalizationAndSync';
import ProjectDetails from './pages/ProjectDetails';
import PropertySearch from './pages/PropertySearch';
import ReminderSettings from './pages/ReminderSettings';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import TaskTemplates from './pages/TaskTemplates';
import TeamDeals from './pages/TeamDeals';
import TerritoryManager from './pages/TerritoryManager';
import WorkflowAnalytics from './pages/WorkflowAnalytics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgentAnalytics": AgentAnalytics,
    "AgentDashboard": AgentDashboard,
    "AgentPerformanceReport": AgentPerformanceReport,
    "AgentTransactions": AgentTransactions,
    "AlertSettings": AlertSettings,
    "AssignmentConfig": AssignmentConfig,
    "BorrowerDashboard": BorrowerDashboard,
    "BuilderDashboard": BuilderDashboard,
    "BuyerPortal": BuyerPortal,
    "CRMIntegrations": CRMIntegrations,
    "CRMReportingDashboard": CRMReportingDashboard,
    "Calendar": Calendar,
    "CalendarSettings": CalendarSettings,
    "ClientPortal": ClientPortal,
    "ContactDetails": ContactDetails,
    "ContactSegments": ContactSegments,
    "Contacts": Contacts,
    "DeveloperProjectShowcase": DeveloperProjectShowcase,
    "DocuSignSettings": DocuSignSettings,
    "EmailAutomation": EmailAutomation,
    "Home": Home,
    "IDXSettings": IDXSettings,
    "LeadPool": LeadPool,
    "LeadScoringRules": LeadScoringRules,
    "LenderPortal": LenderPortal,
    "MarketDataSettings": MarketDataSettings,
    "MilestoneConfig": MilestoneConfig,
    "NurtureWorkflows": NurtureWorkflows,
    "OnboardingManagement": OnboardingManagement,
    "PersonalizationAndSync": PersonalizationAndSync,
    "ProjectDetails": ProjectDetails,
    "PropertySearch": PropertySearch,
    "ReminderSettings": ReminderSettings,
    "Reminders": Reminders,
    "Reports": Reports,
    "TaskTemplates": TaskTemplates,
    "TeamDeals": TeamDeals,
    "TerritoryManager": TerritoryManager,
    "WorkflowAnalytics": WorkflowAnalytics,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};