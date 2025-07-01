export default function ExpandSidebar() {    
    const [isMobile, setIsMobile] = useState(false);

    return (
        <>
        {isMobile && !sidebarExpanded && (
        <button
            className="expand-sidebar-btn"
            onClick={() => setSidebarExpanded(true)}
            aria-label="Open sidebar"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="4" height="16" rx="1" fill="#6599a6"/>
            <rect x="9" y="4" width="12" height="16" rx="2" fill="#b3c6cc"/>
            </svg>
        </button>
        )}
    </>
  );
}