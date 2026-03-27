import { SectionHeading } from "@/components/shared/section-heading";
import { operatingSteps, platformPillars } from "@/lib/homepage-data";

export function OperatingSystemSection() {
  return (
    <section className="section-block section-block--alt">
      <div className="shell operating-grid">
        <div>
          <SectionHeading
            eyebrow="Operating Model"
            title="The platform is being built around the full trade lifecycle"
            description="From discovery to payout review, each layer is planned as a connected product system instead of a collection of disconnected pages."
          />

          <div className="steps-list">
            {operatingSteps.map((step, index) => (
              <article key={step.title} className="step-card">
                <span className="step-card__number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="pillar-stack">
          {platformPillars.map((pillar) => (
            <article key={pillar.title} className="pillar-card">
              <span className="section-eyebrow">{pillar.title}</span>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
