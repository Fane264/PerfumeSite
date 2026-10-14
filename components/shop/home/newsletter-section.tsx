import { Reveal } from "@/components/shop/reveal";
import { NewsletterForm } from "@/components/shop/newsletter-form";

export function NewsletterSection() {
  return (
    <section className="bg-background py-24">
      <Reveal className="container flex flex-col items-center text-center">
        <p className="mb-3 text-xs uppercase tracking-luxe text-gold">Newsletter</p>
        <h2 className="max-w-xl font-serif text-4xl font-light text-cream md:text-5xl">
          Fii primul care știe
        </h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          Noutăți, lansări exclusive și oferte disponibile doar pentru abonați.
        </p>
        <NewsletterForm className="mt-8 justify-center" />
      </Reveal>
    </section>
  );
}
