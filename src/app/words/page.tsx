import type { LexemesData } from "@/types";
import data from "@/combined_lexemes.json";
import { Layout } from "@/components/Layout";
import { WordsTable } from "@/components/WordsTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Words • Lexeme Practice",
  description: "Browse all Indonesian words with translations and audio",
};

export default function WordsPage() {
  const { learnedLexemes } = data as LexemesData;

  return (
    <Layout>
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>All Words</CardTitle>
            <CardDescription>
              Search Indonesian lexemes, view English translations, and play audio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WordsTable lexemes={learnedLexemes} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
