import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-glass-bg border-b border-glass-border">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 animate-fade-in">
          <img
            src="/logo.png"
            alt="URJALINK logo"
            className="h-16 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-900">URJALINK</h1>
        </div>
        <Link
          to="/area-analysis"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
        >
          <MapPin className="h-4 w-4" />
          IntelliSolar
        </Link>
      </div>
    </header>
  );
};
