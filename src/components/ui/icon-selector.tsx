"use client";

import { useState, useEffect, useRef } from "react";
import * as Icons from "lucide-react";
import { ChevronDown, Search, Check } from "lucide-react";

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

/*
Get all icon names from lucide-react automatically
This allows searching through the entire library
*/
const allIcons = Object.keys(Icons);

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredIcons, setFilteredIcons] = useState<string[]>(allIcons.slice(0, 40));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchLower = search.toLowerCase();

    const results = allIcons
      .filter((icon) => icon.toLowerCase().includes(searchLower))
      .slice(0, 40); // limit results for performance

    setFilteredIcons(results);
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const SelectedIconComponent = value ? (Icons as any)[value] : null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Icon</label>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 border rounded-lg bg-background hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {/* Icon preview square */}
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border">
              {SelectedIconComponent ? (
                <SelectedIconComponent className="w-5 h-5 text-foreground" />
              ) : (
                <Icons.Box className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* Selected icon name or placeholder */}
            <span className="text-sm text-foreground">
              {value || "Select an icon"}
            </span>
          </div>

          {/* Dropdown arrow */}
          <ChevronDown 
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 p-2 bg-popover border rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {/* Search input */}
            <div className="mb-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search icons (video, code, design...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            {/* Icon list */}
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {filteredIcons.map((iconName) => {
                const IconComponent = (Icons as any)[iconName];
                const isSelected = value === iconName;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{iconName}</span>
                    </div>
                    
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No icons found
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Search and select an icon for this domain
      </p>
    </div>
  );
}

/*
Helper function to render icon dynamically anywhere in the project
*/
export function getIconComponent(iconName: string | null) {
  if (!iconName) return Icons.Code;

  return (Icons as any)[iconName] || Icons.Code;
}
