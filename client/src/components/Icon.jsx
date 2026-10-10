const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  external: 'M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
  check: 'm5 12 4 4L19 6',
  book: 'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1m0-15c3-2 6-2 10-1v15c-4-1-7-1-10 1V5',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 9 3 3 5-5',
  clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  minus: 'M7 12h10M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  search: 'm16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6',
  leaf: 'M5 19C1 5 10 3 21 3c0 12-4 18-13 15M3 22 16 9',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  chevron: 'm9 5 7 7-7 7',
  edit: 'm15 4 5 5M3 21l5-1L21 7l-4-4L4 16l-1 5',
};
export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.info} />
    </svg>
  );
}
