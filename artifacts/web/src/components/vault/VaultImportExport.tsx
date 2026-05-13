import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type VaultTabKind = "set" | "single";
export type ImportExportCategory = "lego" | "tcg";

const PRO_BADGE_CLASS =
  "text-[9px] px-1.5 py-0 h-4 border-accent/40 text-accent uppercase tracking-wide";

export function VaultSearchBar({
  value,
  onChange,
  tab,
}: {
  value: string;
  onChange: (v: string) => void;
  tab: VaultTabKind;
}) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tab === "set" ? "Search sets…" : "Search singles…"}
        className="pl-9"
      />
    </div>
  );
}

export function ImportExportButton({
  category,
  isPro,
}: {
  category: ImportExportCategory;
  isPro: boolean;
}) {
  if (!isPro) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileSpreadsheet className="size-4 mr-1" />
            Import / Export
            <Badge variant="outline" className={`${PRO_BADGE_CLASS} ml-2`}>
              Pro
            </Badge>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-5 py-4">
            <div className="size-12 rounded-full bg-primary/15 grid place-items-center mx-auto">
              <Lock className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">
                Bulk Import & Export is Premium
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Move your collection in and out of GrailBabe with a CSV.
                Upgrade to unlock bulk transfer for your{" "}
                {category === "lego" ? "LEGO" : "TCG"} items.
              </p>
            </div>
            <Link href="/billing">
              <Button>Upgrade to Premium</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return <ProImportExportSheet category={category} />;
}

function ProImportExportSheet({
  category,
}: {
  category: ImportExportCategory;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="size-4 mr-1" />
          Import / Export
          <Badge variant="outline" className={`${PRO_BADGE_CLASS} ml-2`}>
            Pro
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif">
            {category === "lego" ? "LEGO" : "TCG"} CSV Import / Export
          </SheetTitle>
          <SheetDescription>
            Move items in bulk. Photos are not part of the CSV — keep them in
            place or upload them per item later.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="import" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="space-y-5 mt-5">
            <ImportPanel
              category={category}
              onDone={() => setOpen(false)}
            />
          </TabsContent>
          <TabsContent value="export" className="space-y-5 mt-5">
            <ExportPanel category={category} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

async function downloadFile(path: string, filename: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type ImportResult = {
  inserted: number;
  errors: { row: number; message: string }[];
  truncated: number;
  totalRows: number;
};

function ImportPanel({
  category,
  onDone,
}: {
  category: ImportExportCategory;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"template" | "upload" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleTemplate = async () => {
    setBusy("template");
    try {
      await downloadFile(
        `/api/vault/template/${category}`,
        `grailbabe-${category}-template.csv`,
      );
    } catch {
      toast.error("Could not download template");
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setBusy("upload");
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch(`/api/vault/import/${category}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? `Upload failed (${res.status})`);
      }
      const data = (await res.json()) as ImportResult;
      setResult(data);
      qc.invalidateQueries();
      if (data.inserted > 0) {
        toast.success(
          `Imported ${data.inserted} item${data.inserted === 1 ? "" : "s"}`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <Step n={1} title="Download the template">
        <p className="text-xs text-muted-foreground">
          Get the CSV with the right columns and one example row.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTemplate}
          disabled={busy === "template"}
        >
          <Download className="size-4 mr-1" />
          {busy === "template" ? "Preparing…" : "Download template"}
        </Button>
      </Step>

      <Separator />

      <Step n={2} title="Choose your filled CSV">
        <DropZone file={file} onFile={setFile} />
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          Photos are not imported — add them per item after the CSV finishes.
        </p>
      </Step>

      <Separator />

      <Step n={3} title="Submit">
        <Button
          onClick={handleSubmit}
          disabled={!file || busy === "upload"}
        >
          <Upload className="size-4 mr-1" />
          {busy === "upload" ? "Importing…" : "Import to vault"}
        </Button>
      </Step>

      {result && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium text-emerald-400">
              {result.inserted}
            </span>{" "}
            of {result.totalRows} row{result.totalRows === 1 ? "" : "s"}{" "}
            imported.
          </div>
          {result.truncated > 0 && (
            <div className="text-amber-400 text-xs">
              {result.truncated} row{result.truncated === 1 ? "" : "s"} skipped
              — vault limit reached. Upgrade for unlimited capacity.
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {result.errors.length} row
                {result.errors.length === 1 ? "" : "s"} skipped:
              </div>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.inserted > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDone}
              className="mt-2"
            >
              Done
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DropZone({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.name.toLowerCase().endsWith(".csv")) onFile(f);
        else if (f) toast.error("Only .csv files are allowed");
      }}
      className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        drag
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <FileSpreadsheet className="size-6 mx-auto mb-2 text-muted-foreground" />
      <div className="text-sm">
        {file ? (
          <span className="font-medium">{file.name}</span>
        ) : (
          <>
            <span className="text-foreground">Drop a CSV</span>
            <span className="text-muted-foreground"> or click to choose</span>
          </>
        )}
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function ExportPanel({ category }: { category: ImportExportCategory }) {
  const [busy, setBusy] = useState(false);
  const handleExport = async () => {
    setBusy(true);
    try {
      await downloadFile(
        `/api/vault/export/${category}`,
        `grailbabe-${category}-export.csv`,
      );
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Download every {category === "lego" ? "LEGO" : "TCG"} item in your
        vault as a CSV — perfect for spreadsheets, backups, or moving between
        devices.
      </p>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2">
        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
        <span>
          Photos are not included in the export. Item names, set info,
          conditions, grades, and values are.
        </span>
      </div>
      <Button onClick={handleExport} disabled={busy}>
        <Download className="size-4 mr-1" />
        {busy ? "Preparing…" : "Download CSV"}
      </Button>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="size-5 rounded-full bg-muted text-muted-foreground text-xs grid place-items-center">
          {n}
        </div>
        <div className="font-medium text-sm">{title}</div>
      </div>
      <div className="pl-7 space-y-2">{children}</div>
    </div>
  );
}
