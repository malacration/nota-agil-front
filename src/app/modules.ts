import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { FluidModule } from "primeng/fluid";
import { InputGroupModule } from "primeng/inputgroup";
import { InputGroupAddonModule } from "primeng/inputgroupaddon";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { TooltipModule } from "primeng/tooltip";


export const COMMON = [
    CommonModule,
    RouterModule,
    TagModule,
    DividerModule
]

export const INPUTS = [
    ButtonModule,
    SelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputNumberModule,
    InputTextModule,
    FluidModule,
    FormsModule,
    TooltipModule,
]

export const UIKIT = [
    ToolbarModule,
    BadgeModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule
]

export const TABLE = [
    TableModule,
]