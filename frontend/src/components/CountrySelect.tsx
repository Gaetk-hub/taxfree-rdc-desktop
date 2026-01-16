import { useState, useRef, useEffect } from 'react';
import { countries, Country, searchCountries } from '../data/countries';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  excludeCountries?: string[];
}

export default function CountrySelect({
  value,
  onChange,
  placeholder = 'Sélectionner un pays...',
  label,
  required,
  error,
  disabled,
  excludeCountries = [],
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.code === value);
  
  const filteredCountries = search 
    ? searchCountries(search).filter(c => !excludeCountries.includes(c.code))
    : countries.filter(c => !excludeCountries.includes(c.code));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: Country) => {
    onChange(country.code);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          relative w-full px-4 py-2.5 border rounded-xl cursor-pointer transition-all
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 hover:bg-white'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
          ${error ? 'border-red-300 ring-red-100' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-gray-900">{selectedCountry.name}</span>
              <span className="text-gray-400 text-sm">({selectedCountry.code})</span>
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {selectedCountry && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <XMarkIcon className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  onClick={() => handleSelect(country)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                    ${value === country.code ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1">
                    <span className="font-medium">{country.name}</span>
                    <span className="text-gray-400 text-sm ml-2">({country.code})</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-gray-500 text-sm">
                Aucun pays trouvé
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
