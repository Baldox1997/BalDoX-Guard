import { NavLink } from "react-router-dom";
import { BRAND_ICON_IMAGE, PRODUCT_NAME, PRODUCT_SUBTITLE, TAGLINE } from "../constants/brand";
import { NAV_ITEMS } from "../types/navigation";

export function Sidebar() {
  return (
    <aside className="warrior-panel flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <img
          src={BRAND_ICON_IMAGE}
          alt={PRODUCT_NAME}
          className="h-9 w-9 shrink-0 rounded-lg object-cover drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]"
          width={36}
          height={36}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{PRODUCT_NAME}</p>
          <p className="truncate text-xs text-primary">{PRODUCT_SUBTITLE}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-primary text-white shadow-sm shadow-primary/25"
                      : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                  ].join(" ")
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-text-secondary">{TAGLINE}</p>
      </div>
    </aside>
  );
}
