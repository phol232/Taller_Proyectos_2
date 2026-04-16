// Shell estándar de página con título y descripción
interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageShell({ title, description, actions, children }: PageShellProps) {
  return (
    <div className="flex flex-col flex-1 p-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#171717] dark:text-white" style={{ letterSpacing: "-1.28px" }}>
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
