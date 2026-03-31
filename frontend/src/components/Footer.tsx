import Link from 'next/link';
import { Tag } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-brand-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Tag className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg">
                I&apos;m <span className="text-primary">Broke</span>
              </span>
            </div>
            <p className="text-sm text-brand-muted max-w-xs leading-relaxed">
              Singapore&apos;s go-to platform for student discounts, flash sales, 1-for-1 offers, and local events — all in one place.
            </p>
            <p className="mt-4 text-xs text-brand-muted">
              Data sourced ethically from public channels. We respect all platforms&apos; terms of service.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Discover</h3>
            <ul className="space-y-2 text-sm text-brand-muted">
              {['Deals', 'Map', 'Events', 'Add a Deal'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="hover:text-primary transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-brand-muted">
              {[['About', '/about'], ['Contact', '/contact'], ['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-brand-border flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-brand-muted">
          <p>© 2025 I&apos;m Broke. Made with 💸 in Singapore.</p>
          <p>Updated daily · 12,400+ deals tracked</p>
        </div>
      </div>
    </footer>
  );
}
