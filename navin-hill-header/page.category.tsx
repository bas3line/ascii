import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { PieceName } from "ascii.rest";
import { SceneHero } from "@/components/scene-hero/scene-hero";
import { mockData } from "@/lib/mock-data";
import "./[subject]/subject.css";
import "../list.css";

/** Categories whose header is an ascii.rest scene instead of their gallery image. */
const sceneHeaders: Partial<Record<string, PieceName>> = {
  initiatives: "ocean-sunset",
};

const heroMeta = ["Project Overview", "Highlights", "Updates", "Links"];

export function generateStaticParams() {
  return Object.keys(mockData).map((category) => ({
    category,
  }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const data = mockData[category];

  if (!data) {
    notFound();
  }

  const scene = sceneHeaders[category];

  return (
    <div className="category-page">
      {category !== 'art' && (
        scene ? (
          <SceneHero piece={scene} title={data.title} meta={heroMeta} />
        ) : (
          <div className="subject-hero">
            <Image
              src={data.image}
              alt={data.title}
              fill
              style={{ objectFit: 'cover' }}
            />
            <div className="subject-hero-overlay">
              <h1 className="subject-hero-title">{data.title}</h1>
              <ul className="subject-hero-meta">
                {heroMeta.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      )}

      {category === 'art' ? (
        <div className="art-subject-grid">
          {data.subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/${category}/${subject.id}`}
              className="art-grid-item"
            >
              <Image
                src={subject.image}
                alt={subject.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="subject-list-container">
          <div className="subject-list">
            {data.subjects.map((subject) => (
              <div key={subject.id} className="subject-item">
                <Link href={`/${category}/${subject.id}`} className="subject-thumbnail">
                  <Image
                    src={subject.image}
                    alt={subject.title}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </Link>
                <div className="subject-content">
                  <Link href={`/${category}/${subject.id}`} style={{ textDecoration: 'none' }}>
                    <h2 className="subject-title">{subject.title}</h2>
                  </Link>
                  <ul className="subject-meta">
                    <li>Project Overview</li>
                    <li>Highlights</li>
                    <li>Updates</li>
                    <li>Links</li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
