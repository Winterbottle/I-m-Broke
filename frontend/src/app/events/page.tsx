'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, ExternalLink, Users, Loader2 } from 'lucide-react';
import { getEvents } from '@/lib/api';
import { Event } from '@/types';
import clsx from 'clsx';

const CATEGORIES = ['All', 'Concerts', 'Sports', 'Workshops', 'Food', 'Tech', 'Culture', 'Community'];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [studentOnly, setStudentOnly] = useState(false);

  useEffect(() => {
    getEvents({ category: category === 'All' ? undefined : category, student_only: studentOnly })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [category, studentOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1">Events in Singapore</h1>
        <p className="text-brand-muted">Free and paid events, workshops, and meetups near you</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all',
                category === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-brand-muted border-brand-border hover:border-primary/50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setStudentOnly(!studentOnly)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all ml-auto',
            studentOnly
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-brand-border text-brand-muted'
          )}
        >
          <Users className="w-4 h-4" />
          Student Events
        </button>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24 text-brand-muted">
          <p className="text-5xl mb-3">🎉</p>
          <p className="font-semibold">No events found</p>
          <p className="text-sm mt-1">Check back soon for upcoming events!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const isHappeningNow =
    new Date(event.start_date) <= new Date() &&
    (!event.end_date || new Date(event.end_date) >= new Date());

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-brand-border hover:border-primary/30 transition-all deal-card">
      {/* Header color band */}
      <div className="h-2 bg-gradient-to-r from-primary to-amber-400" />

      <div className="p-5">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {isHappeningNow && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
              Happening Now
            </span>
          )}
          {event.is_free && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">FREE</span>
          )}
          {event.is_student_eligible && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Student</span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-brand-muted">{event.category}</span>
        </div>

        <h3 className="font-bold text-lg leading-snug mb-2">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-brand-muted line-clamp-2 mb-4">{event.description}</p>
        )}

        <div className="space-y-2 text-sm text-brand-muted">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <div>
              <p className="font-medium text-brand-dark">
                {format(new Date(event.start_date), 'EEE, d MMM yyyy')}
              </p>
              <p className="text-xs">{format(new Date(event.start_date), 'h:mm a')}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="leading-snug">
              {event.location.venue_name && <strong className="text-brand-dark">{event.location.venue_name}</strong>}
              {event.location.venue_name && <br />}
              {event.location.address}
            </p>
          </div>

          {event.organizer && (
            <p className="text-xs">By <span className="font-medium">{event.organizer}</span></p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-border">
          <span className="font-bold text-lg">
            {event.is_free ? (
              <span className="text-green-600">Free</span>
            ) : (
              <span className="text-brand-dark">${event.price}</span>
            )}
          </span>
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
            >
              Details <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
