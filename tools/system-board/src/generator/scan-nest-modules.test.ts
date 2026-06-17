import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { scanNestModules } from "./scan-nest-modules";

describe("scanNestModules", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "nest-"));
    const mods = join(root, "apps/api/src/modules");
    mkdirSync(join(mods, "dataos/sync"), { recursive: true });
    writeFileSync(
      join(mods, "dataos/dataos.module.ts"),
      `import { SyncModule } from "./sync/sync.module";\nimport { ConfigModule } from "@nestjs/config";\n@Module({ imports: [SyncModule, ConfigModule] })\nexport class DataosModule {}`,
    );
    writeFileSync(
      join(mods, "dataos/sync/sync.module.ts"),
      `@Module({ imports: [] })\nexport class SyncModule {}`,
    );
    // a test file that must be ignored
    writeFileSync(join(mods, "dataos/dataos.module.test.ts"), `describe("x", () => {});`);
  });

  describe("inner-bracket imports", () => {
    let innerRoot: string;
    beforeAll(() => {
      innerRoot = mkdtempSync(join(tmpdir(), "nest-inner-"));
      const mods = join(innerRoot, "apps/api/src/modules");
      mkdirSync(join(mods, "foo/bar"), { recursive: true });
      // FooModule has TypeOrmModule.forFeature([SomeEntity]) BEFORE BarModule in imports
      writeFileSync(
        join(mods, "foo/foo.module.ts"),
        [
          `import { BarModule } from "./bar/bar.module";`,
          `import { TypeOrmModule } from "@nestjs/typeorm";`,
          `@Module({ imports: [TypeOrmModule.forFeature([SomeEntity]), BarModule] })`,
          `export class FooModule {}`,
        ].join("\n"),
      );
      writeFileSync(join(mods, "foo/bar/bar.module.ts"), `@Module({})\nexport class BarModule {}`);
    });

    it("resolves a sibling module that follows an inner-bracket call in imports", () => {
      const mods = scanNestModules(innerRoot);
      const foo = mods.find((m) => m.id === "foo");
      expect(foo).toBeDefined();
      expect(foo!.importIds).toContain("foo/bar");
      expect(foo!.importExternal).not.toContain("BarModule");
    });
  });

  it("discovers modules with path-based id, class name and file location", () => {
    const mods = scanNestModules(root);
    const dataos = mods.find((m) => m.id === "dataos");
    expect(dataos).toBeDefined();
    expect(dataos!.name).toBe("DataosModule");
    expect(dataos!.topLevel).toBe("dataos");
    expect(dataos!.file.path).toBe(join(root, "apps/api/src/modules/dataos/dataos.module.ts"));
    expect(mods.find((m) => m.id === "dataos/sync")?.name).toBe("SyncModule");
    // module.test.ts is not a module
    expect(mods.some((m) => m.id.includes("test"))).toBe(false);
  });

  it("computes parent/child relationships", () => {
    const mods = scanNestModules(root);
    const sync = mods.find((m) => m.id === "dataos/sync");
    expect(sync!.parentId).toBe("dataos");
    expect(mods.find((m) => m.id === "dataos")!.childIds).toContain("dataos/sync");
    expect(mods.find((m) => m.id === "dataos")!.parentId).toBeNull();
  });

  it("resolves imports to local module ids and lists external imports separately", () => {
    const mods = scanNestModules(root);
    const dataos = mods.find((m) => m.id === "dataos")!;
    expect(dataos.importIds).toContain("dataos/sync");
    expect(dataos.importExternal).toContain("ConfigModule");
  });
});
