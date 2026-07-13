import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiBell,
  FiUser,
  FiLogOut,
  FiSettings,
  FiSearch,
  FiChevronDown,
} from "react-icons/fi";
import { useAuthStore } from "../../stores/authStore";

const Header = ({ toggleSidebar, toggleMobileSidebar, sidebarOpen, connected = false, realtimeEvents = [] }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const notifications = realtimeEvents.slice(0, 12).map((event, index) => ({
    id: `${event.type}-${event.time}-${index}`,
    title: event.type.replaceAll(":", " ").replaceAll("_", " "),
    time: new Date(event.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    read: false,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-yard-fog transition-colors focus:outline-none focus:ring-2 focus:ring-yard-navy/30"
              aria-label="Toggle mobile menu"
            >
              <FiMenu className="h-6 w-6 text-slate-700" />
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-2 rounded-md hover:bg-yard-fog transition-colors focus:outline-none focus:ring-2 focus:ring-yard-navy/30"
              aria-label="Toggle sidebar"
            >
              <FiMenu className="h-5 w-5 text-slate-600" />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-yard-fog rounded-md px-3 py-2 border border-transparent focus-within:border-yard-navy/30 focus-within:bg-white transition-colors">
              <FiSearch className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none ml-2 text-sm text-slate-700 placeholder:text-slate-400 w-48 lg:w-64"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-1.5 md:space-x-2">
            {/* Search - Mobile */}
            <button className="md:hidden p-2 rounded-md hover:bg-yard-fog transition-colors">
              <FiSearch className="h-5 w-5 text-slate-600" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-md hover:bg-yard-fog transition-colors relative"
                aria-expanded={isNotificationOpen}
                aria-label="Notifications"
              >
                <FiBell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-[10px] font-mono font-medium rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-display font-medium text-[13.5px] text-yard-navy">
                      Notifications
                    </h3>
                    <button className="text-xs text-slate-500 hover:text-yard-navy transition-colors">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-yard-fog cursor-pointer transition-colors border-l-2 ${
                          !notification.read
                            ? "border-yard-orange bg-yard-fog/60"
                            : "border-transparent"
                        }`}
                      >
                        <p className="text-sm text-slate-800">
                          {notification.title}
                        </p>
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-200">
                    <button className="w-full text-center text-xs text-slate-500 hover:text-yard-navy font-medium transition-colors">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 pr-2 rounded-md hover:bg-yard-fog transition-colors"
                aria-expanded={isDropdownOpen}
              >
                <div className="h-8 w-8 rounded-full bg-yard-navy flex items-center justify-center flex-shrink-0">
                  <FiUser className="h-4 w-4 " />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-display text-slate-800 leading-tight">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 leading-tight">
                    {connected ? "Online" : user?.role?.replaceAll("_", " ") || "Administrator"}
                  </p>
                </div>
                <FiChevronDown className="hidden md:block h-4 w-4 text-slate-400" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-display text-slate-800">
                      {user?.name || "Admin User"}
                    </p>
                    <p className="text-xs text-slate-500">{user?.email || ""}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-yard-fog hover:text-yard-navy flex items-center space-x-2 transition-colors">
                      <FiUser className="h-4 w-4" />
                      <span>Profile</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-yard-fog hover:text-yard-navy flex items-center space-x-2 transition-colors">
                      <FiSettings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                    >
                      <FiLogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
