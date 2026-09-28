export const indianHolidays = [
  // National & Karnataka Public Holidays (2026 dates)
  { date: '2026-01-15', name: "Makara Sankranti", type: 'holiday' },
  { date: '2026-01-26', name: "Republic Day", type: 'holiday' },
  { date: '2026-03-04', name: "Holi", type: 'holiday' },
  { date: '2026-03-19', name: "Ugadi Festival", type: 'holiday' },
  { date: '2026-03-21', name: "Id-ul-Fitr", type: 'holiday' },
  { date: '2026-03-26', name: "Ram Navami", type: 'holiday' },
  { date: '2026-03-31', name: "Mahavir Jayanti", type: 'holiday' },
  { date: '2026-04-03', name: "Good Friday", type: 'holiday' },
  { date: '2026-04-14', name: "Dr. Ambedkar Jayanti", type: 'holiday' },
  { date: '2026-04-20', name: "Basava Jayanti", type: 'holiday' },
  { date: '2026-05-01', name: "Labour Day", type: 'holiday' },
  { date: '2026-05-27', name: "Bakrid (Eid-al-Adha)", type: 'holiday' },
  { date: '2026-06-26', name: "Muharram", type: 'holiday' },
  { date: '2026-08-15', name: "Independence Day", type: 'holiday' },
  { date: '2026-08-26', name: "Eid-Milad", type: 'holiday' },
  { date: '2026-09-04', name: "Janmashtami", type: 'holiday' },
  { date: '2026-09-14', name: "Ganesh Chaturthi", type: 'holiday' },
  { date: '2026-10-02', name: "Gandhi Jayanti", type: 'holiday' },
  { date: '2026-10-20', name: "Vijayadashami (Dasara)", type: 'holiday' },
  { date: '2026-11-01', name: "Kannada Rajyothsava", type: 'holiday' },
  { date: '2026-11-08', name: "Diwali (Deepavali)", type: 'holiday' },
  { date: '2026-11-24', name: "Guru Nanak's Birthday", type: 'holiday' },
  { date: '2026-12-25', name: "Christmas Day", type: 'holiday' }
];

export const getIndianHolidays = (year = new Date().getFullYear()) => {
  return indianHolidays
    .map(holiday => ({
      ...holiday,
      date: `${year}${holiday.date.substring(4)}`
    }));
};
