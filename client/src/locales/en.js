export default {
  // 导航和通用
  common: {
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    clickForDetails: 'Click for details →',
  },
  
  // Hero 部分
  hero: {
    slogan: 'The stronger wind, the stronger trees\nThe further sky, the greater length\nThe more the storm, the more the strength\nBy sun and cold, by rain and snow\nIn trees and men, good timbers grow',
    joinUs: 'Join Us',
    logoAlt: 'corporation logo',
    discordModal: {
      title: 'Discord Contact',
      discordIdLabel: 'Discord ID',
      nicknameLabel: 'Nickname',
      copyHint: 'Add me on Discord to join our corporation.',
      closeButton: 'Close',
      avatarAlt: 'Discord avatar',
    },
  },
  
  // 统计面板
  stats: {
    title: 'Killboard',
    subtitle: 'Click cards to view detailed kill reports',
    totalValue: 'Total ISK Destroyed',
    shipsDestroyed: 'Ships Destroyed',
    shipsLost: 'Ships Lost',
    efficiency: 'Efficiency',
    soloKills: 'Solo Kills',
    avgGangSize: 'Avg Gang Size',
    monthlyKills: 'Monthly Kills',
    loadingStats: 'Loading stats...',
    statsLoadFailed: 'Failed to load statistics',
  },
  
  // 击杀卡片
  killCard: {
    pilot: 'Pilot',
    corpMember: 'Corp Member',
    isk: 'ISK',
    shipFallbackAlt: 'Unknown ship',
  },
  
  // 加载和错误状态
  loading: {
    fetchingKills: 'Loading...',
    noKillsYet: 'No kill records yet',
    noKillsDesc: 'This corporation may not have any kills yet, or data is syncing',
    loadError: 'Unable to load killboard data, please try again later',
  },
  
  // 页脚
  footer: {
    independent: 'Independent',
    corporation: 'Corporation',
    poweredBy: 'Powered by zKillboard & ESI',
  },
  
  // 语言切换
  language: {
    switchTo: 'Switch Language',
    en: 'English',
    zh: '中文',
  },
  
  // 公司信息
  corpInfo: {
    title: 'Corporation Info',
    loading: 'Loading corporation info...',
    loadError: 'Failed to load corporation info',
    members: 'Members',
    ceo: 'CEO',
    taxRate: 'Tax Rate',
    founded: 'Founded',
    website: 'zKillboard',
    locale: 'en-US',
  },

  // SRP 补损系统
  srp: {
    title: 'Ship Replacement Program',
    loginTitle: 'Corporation SRP System',
    loginSubtitle: 'Ship Replacement Program',
    loginDesc: 'Login with your EVE Online account to view and submit SRP requests',
    loginButton: 'Login with EVE SSO',
    adminEntry: 'Admin Login',
    applyTitle: 'Apply for SRP',
    applyDesc: 'Select a loss record to apply for SRP',
    myRequests: 'My Requests',
    myRequestsDesc: 'View your request progress and admin feedback',
    submitTime: 'Submit Time',
    shipId: 'Ship ID',
    zkillLink: 'zKill Link',
    view: 'View',
    myComment: 'My Comment',
    status: 'Status',
    adminFeedback: 'Admin Feedback',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    lossValue: 'Loss Value',
    submitModal: 'Submit SRP Request',
    commentLabel: 'Comment (Optional)',
    commentPlaceholder: 'e.g.: Destroyed during fleet operation...',
    submitButton: 'Submit Request',
    cancel: 'Cancel',
    noLosses: 'No loss records',
    fetchingLosses: 'Fetching data from zKillboard...',
    submitSuccess: 'Request submitted successfully! Check "My Requests" for progress.',
    submitFailed: 'Submit failed',
    welcome: 'Welcome',
    logout: 'Logout',
    srpSystem: 'SRP System',
  },

  // 管理员
  admin: {
    title: 'Admin Login',
    username: 'Username',
    password: 'Password',
    loginButton: 'Login',
    backHome: 'Back to Home',
    dashboard: 'SRP Admin Dashboard',
    requestManagement: 'Request Management',
    adminSettings: 'Admin Settings',
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    character: 'Character',
    submitTime: 'Submit Time',
    zkill: 'zKill',
    link: 'Link',
    playerComment: 'Player Comment',
    status: 'Status',
    adminComment: 'Admin Comment',
    action: 'Action',
    review: 'Review',
    reviewRequest: 'Review Request',
    adminSuggestion: 'Admin Comment/Suggestion',
    adminCommentPlaceholder: 'Optional: Enter feedback for the player...',
    approve: 'Approve',
    reject: 'Reject',
    adminManagement: 'Admin Management',
    addAdmin: 'Add Admin',
    role: 'Role',
    superAdmin: 'Super Admin',
    normalAdmin: 'Admin',
    createTime: 'Create Time',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this admin?',
    confirm: 'Confirm',
  },

  // 导航
  nav: {
    home: 'Home',
    srp: 'SRP',
    myRequests: 'My Requests',
  },
};
