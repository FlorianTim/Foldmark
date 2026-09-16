<!-- Suggested header actions: language dropdown + single-button theme cycler -->
<div class="topbar-actions">
  <label class="field-inline" for="language-switcher">
    <AppIcon name="language" aria-hidden="true" />
    <span class="sr-only">Sprache</span>
    <select id="language-switcher" class="select select-sm" v-model="language">
      <option value="de">Deutsch</option>
      <option value="en">English</option>
    </select>
  </label>

  <IconButton
    icon="theme-cycle"
    label="Theme wechseln"
    icon-only
    variant="outline"
    @click="cycleTheme()"
  />
</div>
