import { Card } from "@/design-system/primitives/card";

type ModuleLandingProps = {
  description: string;
  title: string;
};

export function ModuleLanding({ description, title }: ModuleLandingProps) {
  return (
    <section aria-labelledby="module-heading">
      <p className="text-sm font-medium text-primary">Campus module</p>
      <h1
        className="mt-1 text-3xl font-semibold tracking-tight"
        id="module-heading"
      >
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {description}
      </p>
      <Card className="mt-8 p-6">
        <h2 className="font-medium">Foundation ready</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Routes and module ownership are established. Data operations will be
          enabled after schema, authentication, and authorization are connected.
        </p>
      </Card>
    </section>
  );
}
