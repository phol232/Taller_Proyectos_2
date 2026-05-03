export function formatDecimal(value: number): string {
  return value
    .toFixed(4)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, ".0");
}

export function splitHoursInTenths(totalHours: number): { theoryHours: number; practiceHours: number } {
  const totalTenths = Math.max(2, Math.round(totalHours * 10));
  const theoryTenths = Math.max(1, Math.floor(totalTenths / 2));
  const practiceTenths = Math.max(1, totalTenths - theoryTenths);

  return {
    theoryHours: theoryTenths / 10,
    practiceHours: practiceTenths / 10,
  };
}
