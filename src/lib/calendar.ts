import { format, parseISO } from "date-fns";
import { dateFnsLocalizer } from "react-big-calendar";
import { enUS } from "date-fns/locale";

export const calendarLocalizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: () => new Date(),
  getDay: (date) => date.getDay(),
  locales: { enUS },
});
