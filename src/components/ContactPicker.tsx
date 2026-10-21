import { Check, Heart, Search, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'
import type { Contact } from '../domain/types'
import { readRecentContactIds, recordRecentContact } from '../lib/directSplits'

interface ContactPickerProps {
  contacts: Contact[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  label?: string
  emptyText?: string
}

function matches(contact: Contact, query: string) {
  const needle = query.trim().toLowerCase()
  return !needle || contact.name.toLowerCase().includes(needle) || contact.msisdn.replace(/\s/g, '').includes(needle.replace(/\s/g, ''))
}

export function ContactPicker({ contacts, selectedIds, onChange, multiple = false, label = 'Choose people', emptyText = 'No saved contacts match this search.' }: ContactPickerProps) {
  const [query, setQuery] = useState('')
  const recentIds = readRecentContactIds()
  const recent = recentIds.map((id) => contacts.find((contact) => contact.id === id)).filter((contact): contact is Contact => Boolean(contact) && matches(contact as Contact, query))
  const favourites = contacts.filter((contact) => contact.favorite && matches(contact, query))
  const sections = [
    { id: 'recent', title: 'Recent', icon: <Sparkles size={13} />, contacts: recent },
    { id: 'favourite', title: 'Favourites', icon: <Heart size={13} />, contacts: favourites },
    { id: 'all', title: 'All contacts', icon: <Users size={13} />, contacts: contacts.filter((contact) => matches(contact, query)) },
  ]

  function toggle(contact: Contact) {
    recordRecentContact(contact.id)
    if (multiple) onChange(selectedIds.includes(contact.id) ? selectedIds.filter((id) => id !== contact.id) : [...selectedIds, contact.id])
    else onChange(selectedIds.includes(contact.id) ? [] : [contact.id])
  }

  return <div className="contact-picker">
    <div className="contact-picker__label"><span>{label}</span><small>{multiple ? `${selectedIds.length} selected` : selectedIds.length ? 'Selected' : 'Select one'}</small></div>
    <label className="contact-picker__search"><Search size={15} /><input className="contact-picker-search-input" value={query} placeholder="Search by name or number" onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="contact-picker__sections">
      {sections.map((section) => section.contacts.length > 0 && <section className="contact-picker__section" key={section.id}>
        <h4>{section.icon}{section.title}<span>{section.contacts.length}</span></h4>
        <div>{section.contacts.map((contact) => {
          const selected = selectedIds.includes(contact.id)
          return <button key={`${section.id}-${contact.id}`} type="button" className={`contact-picker__row ${selected ? 'is-selected' : ''}`} onClick={() => toggle(contact)}>
            <span className="contact-picker__avatar">{contact.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
            <span><strong>{contact.name}</strong><small>{contact.msisdn}</small></span>
            {contact.favorite && <Heart size={13} className="is-favourite" fill="currentColor" />}
            <i>{contact.isRegisteredUser ? 'FAIRSHARE' : 'PHONE'}</i>
            <span className="contact-picker__check">{selected && <Check size={13} />}</span>
          </button>
        })}</div>
      </section>)}
      {sections.every((section) => section.contacts.length === 0) && <p className="contact-picker__empty">{emptyText}</p>}
    </div>
  </div>
}
