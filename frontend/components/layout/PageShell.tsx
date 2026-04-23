// Shell estándar de página con título y descripción
interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageShell({ title, description, actions, children }: PageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-8 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[720px]">
          <h1 className="text-[32px] font-semibold leading-[1.05] text-[#171717] dark:text-white" style={{ letterSpacing: "-1.28px" }}>
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-[#4d4d4d] dark:text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 self-start">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
