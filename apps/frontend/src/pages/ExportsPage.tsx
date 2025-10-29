export function ExportsPage() {
  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h1 className="panel__title">Exports</h1>
          <p className="panel__subtitle">
            Generate CSV, JSON, or GeoJSON exports for inventory, command logs, and targets.
          </p>
        </div>
        <button type="button" className="control-chip">
          Generate All
        </button>
      </header>
      <div className="empty-state">
        <div>
          Export presets will appear here. Choose a dataset to download once data ingestion is
          configured.
        </div>
      </div>
    </section>
  );
}
