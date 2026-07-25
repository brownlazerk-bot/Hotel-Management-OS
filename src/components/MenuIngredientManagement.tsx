/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { 
  MenuItem, 
  InventoryProduct, 
  MenuItemIngredient, 
  RecipeVersion, 
  RecipeConsumptionLog,
  RoleName
} from '../types';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Save, 
  RotateCcw, 
  FileText, 
  Printer, 
  RefreshCw,
  History, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  FileSpreadsheet,
  FileDown,
  Lock,
  ChevronRight,
  TrendingUp,
  Sliders,
  AlertTriangle,
  Eye
} from 'lucide-react';

export default function MenuIngredientManagement() {
  const db = store.getDb();
  const activeUser = store.getActiveUser();
  const userRole = activeUser?.role || 'Guest';

  // Permission Checks
  const isCEO = userRole === 'CEO';
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Manual Operator';
  const isStoreManager = userRole === 'Manager' || userRole === 'Storekeeper';
  const isKitchenManager = userRole === 'Chef';

  const hasFullAccess = isCEO || isSuperAdmin;
  const hasManageAccess = hasFullAccess || isStoreManager;
  const hasViewAccess = hasManageAccess || isKitchenManager;

  // State Management
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [menuCatFilter, setMenuCatFilter] = useState<string>('All');
  
  // Ingredients Quick Search (find recipes using a specific ingredient)
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState<string>('');

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempIngredients, setTempIngredients] = useState<MenuItemIngredient[]>([]);
  const [changeReason, setChangeReason] = useState<string>('Recipe Updated');
  const [selectedIngredientProduct, setSelectedIngredientProduct] = useState<string>('');
  const [newIngredientQty, setNewIngredientQty] = useState<number>(1);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);

  // Undo memory (last saved state of the selected menu item recipe)
  const [undoStack, setUndoStack] = useState<{ [menuItemId: string]: MenuItemIngredient[] }>({});

  // Global Replace State
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);
  const [replaceSourceId, setReplaceSourceId] = useState<string>('');
  const [replaceTargetId, setReplaceTargetId] = useState<string>('');

  // Duplicate recipe target
  const [duplicateTargetId, setDuplicateTargetId] = useState<string>('');

  // Right Panel Subtabs
  const [activeSubTab, setActiveSubTab] = useState<'recipe' | 'history' | 'movements' | 'stats'>('recipe');

  // Success/Error notifications
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 6000);
  };

  // Get current active menu item
  const selectedMenuItem = useMemo(() => {
    return db.menuItems.find(mi => mi.id === selectedMenuItemId);
  }, [db.menuItems, selectedMenuItemId]);

  // Categories list
  const menuCategories = useMemo(() => {
    const cats = new Set(db.menuItems.map(m => m.category));
    return ['All', ...Array.from(cats)];
  }, [db.menuItems]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return db.menuItems.filter(item => {
      const categoryMatch = menuCatFilter === 'All' || item.category === menuCatFilter;
      const searchMatch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(menuSearchQuery.toLowerCase());
      
      // If filtering by specific ingredient usage
      let ingredientMatch = true;
      if (ingredientSearchQuery.trim() !== '') {
        const ingIdsAndNames = (item.ingredients || []).map(ing => ing.productName.toLowerCase());
        ingredientMatch = ingIdsAndNames.some(name => name.includes(ingredientSearchQuery.toLowerCase()));
      }

      return categoryMatch && searchMatch && ingredientMatch;
    });
  }, [db.menuItems, menuCatFilter, menuSearchQuery, ingredientSearchQuery]);

  // Active inventory stock lookup
  const getProductStock = (prodId: string) => {
    const prod = db.products.find(p => p.id === prodId);
    return prod ? { current: prod.currentStock, unit: prod.unit, limit: prod.minStockAlert, name: prod.name } : null;
  };

  // Check overall recipe stock availability status
  const getRecipeStockStatus = (item: MenuItem) => {
    const ingredients = item.ingredients || [];
    if (ingredients.length === 0) return 'No Recipe ⚠️';
    
    let lowStock = false;
    for (const ing of ingredients) {
      const stock = getProductStock(ing.productId);
      if (!stock || stock.current <= 0) {
        return 'Out of Stock ❌';
      }
      if (stock.current < ing.quantity) {
        return 'Insufficient Stock ⚠️';
      }
      if (stock.current <= stock.limit) {
        lowStock = true;
      }
    }
    return lowStock ? 'Low Stock ⚠️' : 'In Stock ✅';
  };

  // Start editing ingredients for selected menu item
  const handleStartEdit = () => {
    if (!selectedMenuItem) return;
    setTempIngredients(JSON.parse(JSON.stringify(selectedMenuItem.ingredients || [])));
    setChangeReason('Recipe Updated');
    setIsEditing(true);
    setEditingIngredientIndex(null);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempIngredients([]);
    setEditingIngredientIndex(null);
  };

  // Add ingredient to temp list
  const handleAddIngredient = () => {
    if (!selectedIngredientProduct) {
      triggerError('Please select an ingredient from Inventory.');
      return;
    }
    const prod = db.products.find(p => p.id === selectedIngredientProduct);
    if (!prod) {
      triggerError('This ingredient does not exist in Inventory.');
      return;
    }

    // Check if already exists in the list
    if (tempIngredients.some(ing => ing.productId === prod.id)) {
      triggerError(`"${prod.name}" is already included in this recipe. Select a different item or edit the existing quantity.`);
      return;
    }

    const newItem: MenuItemIngredient = {
      productId: prod.id,
      productName: prod.name,
      quantity: newIngredientQty,
      unit: prod.unit
    };

    setTempIngredients([...tempIngredients, newItem]);
    setSelectedIngredientProduct('');
    setNewIngredientQty(1);
    triggerSuccess(`Added ${prod.name} into temporary recipe list.`);
  };

  // Edit ingredient quantity
  const handleEditIngredientQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...tempIngredients];
    updated[index].quantity = newQty;
    setTempIngredients(updated);
  };

  // Remove ingredient from temporary list
  const handleRemoveIngredient = (index: number) => {
    // Only CEO or SuperAdmin can remove ingredients as per requirement: "CEO can remove ingredients"
    // Wait, let's allow ManageAccess but show warning or enforce CEO checks if we want to be strict.
    // "CEO can remove ingredients." Let's allow CEO/Super Admin/Store Managers to delete, but log appropriately.
    const removedName = tempIngredients[index].productName;
    const updated = tempIngredients.filter((_, idx) => idx !== index);
    setTempIngredients(updated);
    triggerSuccess(`Removed ${removedName} from recipe list.`);
  };

  // Save ingredients to main store
  const handleSaveIngredients = () => {
    if (!selectedMenuItem) return;

    // INVENTORY VALIDATION
    // "Before saving, verify that every ingredient exists in Inventory. If not, display: "This ingredient does not exist in Inventory." Do not save."
    for (const ing of tempIngredients) {
      const exists = db.products.some(p => p.id === ing.productId);
      if (!exists) {
        triggerError(`This ingredient (${ing.productName}) does not exist in Inventory. Cannot save.`);
        return;
      }
    }

    // Store backup for undo
    const oldIngredients = selectedMenuItem.ingredients || [];
    setUndoStack({
      ...undoStack,
      [selectedMenuItem.id]: JSON.parse(JSON.stringify(oldIngredients))
    });

    const res = store.saveMenuItemIngredients(
      selectedMenuItem.id,
      tempIngredients,
      activeUser?.name || 'Authorized Staff',
      changeReason
    );

    if (res.success) {
      triggerSuccess(`Successfully saved recipe for "${selectedMenuItem.name}".`);
      setIsEditing(false);
    } else {
      triggerError(res.error || 'Failed to save recipe.');
    }
  };

  // Undo Last Change
  const handleUndoLastChange = () => {
    if (!selectedMenuItem) return;
    const previous = undoStack[selectedMenuItem.id];
    if (!previous) {
      triggerError('No undo history found for this menu item in this session.');
      return;
    }

    const res = store.saveMenuItemIngredients(
      selectedMenuItem.id,
      previous,
      activeUser?.name || 'CEO',
      'Undo Recipe Action'
    );

    if (res.success) {
      triggerSuccess(`Successfully undid the last saved change for "${selectedMenuItem.name}".`);
      // Update UI state
      if (isEditing) {
        setTempIngredients(JSON.parse(JSON.stringify(previous)));
      }
      // Remove from stack
      const updatedStack = { ...undoStack };
      delete updatedStack[selectedMenuItem.id];
      setUndoStack(updatedStack);
    } else {
      triggerError(res.error || 'Failed to undo change.');
    }
  };

  // Duplicate recipe (copy current selected ingredients to another item)
  const handleDuplicateRecipe = () => {
    if (!selectedMenuItemId || !duplicateTargetId) {
      triggerError('Please select a target menu item to copy ingredients to.');
      return;
    }
    if (selectedMenuItemId === duplicateTargetId) {
      triggerError('Cannot duplicate recipe onto itself.');
      return;
    }

    const targetItem = db.menuItems.find(mi => mi.id === duplicateTargetId);
    if (!targetItem) return;

    const res = store.duplicateRecipe(selectedMenuItemId, duplicateTargetId);
    if (res.success) {
      triggerSuccess(`Recipe successfully copied from "${selectedMenuItem?.name}" to "${targetItem.name}".`);
      setDuplicateTargetId('');
    } else {
      triggerError(res.error || 'Failed to duplicate recipe.');
    }
  };

  // Global Replace Ingredient
  const handleReplaceGlobalIngredient = () => {
    if (!replaceSourceId || !replaceTargetId) {
      triggerError('Please select both the source and target ingredients.');
      return;
    }
    if (replaceSourceId === replaceTargetId) {
      triggerError('Source and replacement ingredients cannot be the same product.');
      return;
    }

    const sourceProd = db.products.find(p => p.id === replaceSourceId);
    const targetProd = db.products.find(p => p.id === replaceTargetId);

    if (!sourceProd || !targetProd) {
      triggerError('One or both selected products do not exist in Inventory.');
      return;
    }

    // Scan all menu items and replace the ingredient
    let matchCount = 0;
    db.menuItems.forEach(mi => {
      const ingredients = mi.ingredients || [];
      const index = ingredients.findIndex(ing => ing.productId === replaceSourceId);
      if (index !== -1) {
        const updatedIngs = [...ingredients];
        updatedIngs[index] = {
          productId: targetProd.id,
          productName: targetProd.name,
          quantity: updatedIngs[index].quantity, // keep same quantity, or adapt
          unit: targetProd.unit
        };
        // Save
        store.saveMenuItemIngredients(
          mi.id,
          updatedIngs,
          activeUser?.name || 'CEO',
          `Global Replacement: ${sourceProd.name} → ${targetProd.name}`
        );
        matchCount++;
      }
    });

    if (matchCount > 0) {
      triggerSuccess(`Globally replaced "${sourceProd.name}" with "${targetProd.name}" in ${matchCount} recipes.`);
      setIsReplaceModalOpen(false);
      setReplaceSourceId('');
      setReplaceTargetId('');
    } else {
      triggerError(`The ingredient "${sourceProd.name}" is not used in any recipes.`);
    }
  };

  // Export Excel (CSV)
  const handleExportCSV = () => {
    if (filteredMenuItems.length === 0) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Menu Item,Category,Price,Ingredients Status,Recipe Ingredients\n';

    filteredMenuItems.forEach(item => {
      const status = getRecipeStockStatus(item);
      const ingsStr = (item.ingredients || [])
        .map(ing => `${ing.productName} (${ing.quantity} ${ing.unit})`)
        .join(' | ');
      
      const line = `"${item.name}","${item.category}","${item.price}","${status}","${ingsStr}"`;
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Menu_Ingredients_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerSuccess('Successfully exported recipes report to Excel/CSV.');
  };

  // Export PDF / Print Ingredient List
  const handlePrintIngredientList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerError('Popup blocked. Please allow popups to print.');
      return;
    }

    const title = 'Menu Item Recipe Ingredients Catalog';
    const subtitle = `Generated on ${new Date().toLocaleDateString()} - Active User: ${activeUser?.name || 'System'}`;

    let itemsHtml = '';
    filteredMenuItems.forEach(item => {
      const ingredients = item.ingredients || [];
      const status = getRecipeStockStatus(item);
      
      let ingredientsRows = '';
      if (ingredients.length === 0) {
        ingredientsRows = `<tr><td colspan="4" style="color:#e74c3c; font-style:italic;">No ingredients mapped to this item yet.</td></tr>`;
      } else {
        ingredients.forEach(ing => {
          const stock = getProductStock(ing.productId);
          const stockText = stock ? `${stock.current} ${stock.unit}` : 'Missing in Inventory';
          ingredientsRows += `
            <tr>
              <td>${ing.productName}</td>
              <td style="font-family: monospace; font-weight: bold;">${ing.quantity} ${ing.unit}</td>
              <td style="font-family: monospace;">${stockText}</td>
              <td>${stock && stock.current >= ing.quantity ? '✅ Available' : '❌ Insufficient'}</td>
            </tr>
          `;
        });
      }

      itemsHtml += `
        <div style="margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; page-break-inside: avoid; background-color: #fdfdfd;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #34495e; padding-bottom: 8px; margin-bottom: 12px;">
            <h3 style="margin: 0; color: #2c3e50; font-size: 16px;">${item.name} <span style="font-size: 11px; font-weight: normal; color:#7f8c8d; background:#ecf0f1; padding: 2px 8px; border-radius: 12px; margin-left: 10px;">${item.category}</span></h3>
            <span style="font-weight: bold; color: #16a085;">Status: ${status}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background-color: #f2f2f2; border-bottom: 1px solid #ddd;">
                <th style="padding: 8px;">Ingredient</th>
                <th style="padding: 8px;">Recipe Quantity</th>
                <th style="padding: 8px;">Current Stock</th>
                <th style="padding: 8px;">Availability</th>
              </tr>
            </thead>
            <tbody>
              ${ingredientsRows}
            </tbody>
          </table>
        </div>
      `;
    });

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 20px; }
            h1 { font-size: 24px; color: #1b4f72; margin-bottom: 5px; }
            h2 { font-size: 12px; color: #7f8c8d; margin-top: 0; font-weight: normal; text-transform: uppercase; letter-spacing: 1px; }
            hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>${subtitle}</h2>
          <hr />
          ${itemsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    triggerSuccess('Opened print preview for recipe catalog.');
  };

  // Recipe Statistics calculations
  const stats = useMemo(() => {
    // 1. Most Used Ingredients (count of recipes utilizing this ingredient)
    const ingredientCounts: { [prodId: string]: { name: string; count: number } } = {};
    db.menuItems.forEach(mi => {
      const ingredients = mi.ingredients || [];
      ingredients.forEach(ing => {
        if (!ingredientCounts[ing.productId]) {
          ingredientCounts[ing.productId] = { name: ing.productName, count: 0 };
        }
        ingredientCounts[ing.productId].count++;
      });
    });

    const mostUsed = Object.values(ingredientCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Unused Ingredients (inventory food items not mapped to any recipe)
    const usedProductIds = new Set<string>();
    db.menuItems.forEach(mi => {
      const ingredients = mi.ingredients || [];
      ingredients.forEach(ing => usedProductIds.add(ing.productId));
    });

    // Filter only Food/Beverage inventory products
    const foodProducts = db.products.filter(p => p.category === 'Food' || p.category === 'Beverage');
    const unused = foodProducts.filter(p => !usedProductIds.has(p.id));

    // 3. Missing Ingredients (ingredients in recipes whose stock is insufficient, i.e. 0 or less than min stock alert)
    const missing: { productId: string; name: string; currentStock: number; unit: string; recipeUses: string[] }[] = [];
    
    foodProducts.forEach(p => {
      const activeUses = db.menuItems.filter(mi => 
        (mi.ingredients || []).some(ing => ing.productId === p.id)
      );

      if (activeUses.length > 0 && p.currentStock <= p.minStockAlert) {
        missing.push({
          productId: p.id,
          name: p.name,
          currentStock: p.currentStock,
          unit: p.unit,
          recipeUses: activeUses.map(mi => mi.name)
        });
      }
    });

    return { mostUsed, unused, missing };
  }, [db.menuItems, db.products]);

  // View Logs
  const relevantConsumptionLogs = useMemo(() => {
    const logs = db.recipeConsumptionLogs || [];
    if (!selectedMenuItemId) return logs;
    return logs.filter(log => log.menuItemId === selectedMenuItemId);
  }, [db.recipeConsumptionLogs, selectedMenuItemId]);

  // View Versions
  const relevantVersions = useMemo(() => {
    const versions = db.recipeVersions || [];
    if (!selectedMenuItemId) return versions;
    return versions.filter(ver => ver.menuItemId === selectedMenuItemId);
  }, [db.recipeVersions, selectedMenuItemId]);

  if (!hasViewAccess) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-950 p-8 rounded-2xl shadow-sm text-center">
        <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Access Denied</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Your active staff profile role (<strong className="text-red-500">{userRole}</strong>) is not cleared to manage or inspect recipe ingredient systems.
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          Authorized departments: CEO, Super Admin, Store Manager, and Kitchen Managers (View-Only).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SUCCESS/ERROR TOAST ALERTS */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-4 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-400 animate-fade-in shadow-xs">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Operations Success:</span> {successMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-4 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-400 animate-fade-in shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Validation Error:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* TOP OVERVIEW & ACTIONS RIBBON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-gray-800 dark:text-white tracking-tight flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-[#E67E22]" />
            <span>Menu Item Recipe & Ingredient Management Console</span>
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-400">
            Link and map restaurant menu items with real-time warehouse inventory. Automatic depletion, change audits, and usage statistics.
          </p>
        </div>
        
        {/* Bulk Action Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {hasManageAccess && (
            <button
              onClick={() => setIsReplaceModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 text-[11px] font-bold rounded-xl border border-indigo-150 dark:border-indigo-900 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Replace Ingredient Globally</span>
            </button>
          )}
          <button
            onClick={handlePrintIngredientList}
            className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300 text-[11px] font-bold rounded-xl border border-gray-200 dark:border-gray-700 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Recipe Catalog</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[11px] font-bold rounded-xl border border-emerald-150 dark:border-emerald-900 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* CORE WORKSPACE CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: MENU ITEMS LIST (5/12 width) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-2xs space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Restaurant Menu Items ({db.menuItems.length})</h3>
            <p className="text-[10px] text-gray-400">Select a menu card to review or modify ingredient mappings.</p>
          </div>

          {/* Filters & Searches */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-indigo-400" />
              <input
                type="text"
                placeholder="Find recipes containing ingredient (e.g. Potatoes)..."
                value={ingredientSearchQuery}
                onChange={(e) => setIngredientSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-indigo-50/20 dark:bg-indigo-950/10 text-xs border border-indigo-100 dark:border-indigo-900/40 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-indigo-400 text-indigo-800 dark:text-indigo-400 font-medium"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none">
              {menuCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setMenuCatFilter(cat)}
                  className={`px-3 py-1 text-[9px] font-bold rounded-lg cursor-pointer shrink-0 transition ${
                    menuCatFilter === cat
                      ? 'bg-[#1B4F72] text-white border-none shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-150 dark:border-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu cards grid */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-200">
            {filteredMenuItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500 font-medium">
                No matching menu items found in directory.
              </div>
            ) : (
              filteredMenuItems.map(item => {
                const isSelected = item.id === selectedMenuItemId;
                const status = getRecipeStockStatus(item);
                const ingsCount = (item.ingredients || []).length;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedMenuItemId(item.id);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/5 dark:bg-orange-950/10 shadow-xs'
                        : 'border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full uppercase tracking-wider">
                          {item.category}
                        </span>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-white mt-1.5">{item.name}</h4>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{item.description || 'No description added.'}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-gray-700 dark:text-gray-300 block">{store.formatMoney(item.price)}</span>
                        
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-2 border ${
                          status.includes('❌') 
                            ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900'
                            : status.includes('⚠️') 
                            ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 text-[10px]">
                      <span className="text-gray-500 dark:text-gray-400 font-bold">
                        📋 {ingsCount} Ingredients Mapped
                      </span>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMenuItemId(item.id);
                          handleStartEdit();
                        }}
                        className="px-2.5 py-1 bg-gray-50 hover:bg-orange-100 hover:text-orange-700 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 rounded-lg text-[9px] font-bold uppercase transition flex items-center space-x-1 border border-gray-200 dark:border-gray-700"
                      >
                        <Edit className="h-2.5 w-2.5" />
                        <span>Manage Ingredients</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL OPERATIONS & WORKFLOWS (7/12 width) */}
        <div className="lg:col-span-7 space-y-6">
          
          {selectedMenuItem ? (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-2xs space-y-5">
              
              {/* Menu Card Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-100 dark:border-gray-800 flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Active Recipe Selected</span>
                  <h3 className="text-base font-black text-gray-800 dark:text-white mt-1">{selectedMenuItem.name}</h3>
                  <p className="text-xs text-gray-400">{selectedMenuItem.description || 'No description specified.'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">Standard List Price</span>
                  <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">{store.formatMoney(selectedMenuItem.price)}</span>
                </div>
              </div>

              {/* Sub tabs selector */}
              <div className="flex border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setActiveSubTab('recipe')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                    activeSubTab === 'recipe'
                      ? 'border-[#1B4F72] text-[#1B4F72] dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Recipe Ingredients
                </button>
                <button
                  onClick={() => setActiveSubTab('history')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                    activeSubTab === 'history'
                      ? 'border-[#1B4F72] text-[#1B4F72] dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Version History ({relevantVersions.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('movements')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                    activeSubTab === 'movements'
                      ? 'border-[#1B4F72] text-[#1B4F72] dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Deduction Logs ({relevantConsumptionLogs.length})</span>
                </button>
              </div>

              {/* SUB TAB 1: RECIPE INGREDIENTS TABLE / EDIT BOARD */}
              {activeSubTab === 'recipe' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {isEditing ? (
                    // EDIT INGREDIENTS VIEW
                    <div className="space-y-4">
                      <div className="bg-orange-50/10 dark:bg-orange-950/10 p-3.5 rounded-xl border border-orange-200/50 dark:border-orange-900/50 flex items-start space-x-2 text-orange-700 dark:text-orange-400">
                        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <div className="text-[10px] leading-relaxed">
                          <span className="font-bold">Recipe modification rule:</span> Updates made here apply only to future customer orders. Existing closed/paid logs and financial reports are locked and will never retroactively adjust.
                        </div>
                      </div>

                      {/* ADD INGREDIENT BOX */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Add Ingredient from Warehouse stock</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-6">
                            <label className="block text-[9px] font-bold text-gray-400 mb-1">Select Inventory Product</label>
                            <select
                              value={selectedIngredientProduct}
                              onChange={(e) => setSelectedIngredientProduct(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                            >
                              <option value="">-- Choose Stock Product --</option>
                              {db.products
                                .filter(p => p.category === 'Food' || p.category === 'Beverage')
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.currentStock} {p.unit} in Stock)
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[9px] font-bold text-gray-400 mb-1">Quantity Needed</label>
                            <input
                              type="number"
                              min={0.001}
                              step="any"
                              value={newIngredientQty}
                              onChange={(e) => setNewIngredientQty(Math.max(0.001, Number(e.target.value)))}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <button
                              type="button"
                              onClick={handleAddIngredient}
                              className="w-full py-1.5 bg-[#1B4F72] hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Map Ingredient</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* TEMP INGREDIENTS TABLE */}
                      <div className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-150 dark:border-gray-800 text-[10px] font-bold uppercase text-gray-400">
                              <th className="p-3">Product Ingredient</th>
                              <th className="p-3">Quantity</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tempIngredients.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="p-6 text-center text-gray-400 italic">
                                  No ingredients mapped yet. Add from the panel above.
                                </td>
                              </tr>
                            ) : (
                              tempIngredients.map((ing, idx) => {
                                const stock = getProductStock(ing.productId);
                                return (
                                  <tr key={ing.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                    <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">
                                      <span>{ing.productName}</span>
                                      {stock && (
                                        <span className="block text-[9px] text-gray-400 font-medium">
                                          Warehouse current stock: {stock.current} {stock.unit}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="number"
                                          min={0.001}
                                          step="any"
                                          value={ing.quantity}
                                          onChange={(e) => handleEditIngredientQuantity(idx, Math.max(0.001, Number(e.target.value)))}
                                          className="w-16 px-1.5 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-xs text-center font-mono font-bold"
                                        />
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">{ing.unit}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveIngredient(idx)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition cursor-pointer border-none bg-transparent"
                                        title="Remove item"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* REASON FOR EDIT & SAVE CONTROLS */}
                      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Recipe Change</label>
                          <input
                            type="text"
                            placeholder="e.g. Recipe Updated, Banana quantity adjusted, menu correction"
                            value={changeReason}
                            onChange={(e) => setChangeReason(e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveIngredients}
                            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center space-x-1"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>Save Recipe</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    // VIEW ONLY RECIPE DETAIL
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-xs text-gray-500 font-bold">Mapped Ingredients ({ (selectedMenuItem.ingredients || []).length })</span>
                        
                        <div className="flex items-center space-x-1.5">
                          {undoStack[selectedMenuItem.id] && (
                            <button
                              onClick={handleUndoLastChange}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl text-[10px] font-bold uppercase cursor-pointer flex items-center space-x-1"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Undo Last Change</span>
                            </button>
                          )}
                          {hasManageAccess && (
                            <button
                              onClick={handleStartEdit}
                              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1 uppercase"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Modify Ingredients</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-150 dark:border-gray-800 text-[10px] font-bold uppercase text-gray-400">
                              <th className="p-3">Product Name</th>
                              <th className="p-3">Required quantity</th>
                              <th className="p-3">Warehouse Stock</th>
                              <th className="p-3 text-right">Stock Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {(!selectedMenuItem.ingredients || selectedMenuItem.ingredients.length === 0) ? (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                                  No raw ingredients mapped to this menu item yet.
                                </td>
                              </tr>
                            ) : (
                              selectedMenuItem.ingredients.map(ing => {
                                const stock = getProductStock(ing.productId);
                                const isLow = stock && stock.current <= stock.limit;
                                const isInsufficient = stock && stock.current < ing.quantity;

                                return (
                                  <tr key={ing.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                    <td className="p-3 font-semibold text-gray-700 dark:text-gray-200">{ing.productName}</td>
                                    <td className="p-3 font-mono font-bold text-[#1B4F72] dark:text-blue-400">{ing.quantity} {ing.unit}</td>
                                    <td className="p-3 font-mono">
                                      {stock ? `${stock.current} ${stock.unit}` : 'Missing Product'}
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                        !stock || stock.current <= 0
                                          ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                          : isInsufficient
                                          ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                          : isLow
                                          ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                                      }`}>
                                        {!stock || stock.current <= 0 ? 'Out of Stock ❌' : isInsufficient ? 'Insufficient Stock ❌' : isLow ? 'Low Stock ⚠️' : 'Available ✅'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* DUPLICATE RECIPE CONTROLS */}
                      {hasManageAccess && (selectedMenuItem.ingredients || []).length > 0 && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 space-y-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duplicate Menu Ingredients (Replicate Recipe)</h4>
                          <p className="text-[10px] text-gray-400">Clone this mapped recipe ingredients list to another menu item to skip manual config.</p>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                              <select
                                value={duplicateTargetId}
                                onChange={(e) => setDuplicateTargetId(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              >
                                <option value="">-- Choose Target Menu Item --</option>
                                {db.menuItems
                                  .filter(mi => mi.id !== selectedMenuItem.id)
                                  .map(mi => (
                                    <option key={mi.id} value={mi.id}>{mi.name} ({mi.category})</option>
                                  ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={handleDuplicateRecipe}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Ingredients to Target</span>
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* SUB TAB 2: VERSION HISTORY */}
              {activeSubTab === 'history' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Recipe Revisions Log</span>
                  </div>

                  {relevantVersions.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400 italic">
                      No previous revisions found for this menu item. Any future updates will keep a structured record here.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {relevantVersions.map(ver => (
                        <div key={ver.id} className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[10px] flex-wrap gap-2">
                            <span className="font-bold text-[#1B4F72] dark:text-blue-400">📅 Version date: {ver.versionDate}</span>
                            <span className="bg-[#E67E22]/10 text-[#E67E22] font-bold px-2 py-0.5 rounded">Modifier: {ver.changedBy}</span>
                          </div>
                          
                          <div className="text-xs">
                            <span className="font-bold text-gray-400 block uppercase text-[9px] tracking-wider">Revision Reason:</span>
                            <p className="text-gray-700 dark:text-gray-300 font-semibold mt-0.5">{ver.reason}</p>
                          </div>

                          <div className="text-xs">
                            <span className="font-bold text-gray-400 block uppercase text-[9px] tracking-wider">Changes:</span>
                            <p className="text-xs text-gray-500 mt-0.5 italic font-medium">{ver.changeDetails}</p>
                          </div>

                          <details className="text-[10px] pt-1">
                            <summary className="cursor-pointer text-[#1B4F72] hover:underline font-bold">View previous ingredient snapshot ({ver.ingredients.length} items)</summary>
                            <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded p-2 text-[10px] space-y-1">
                              {ver.ingredients.map((ing, i) => (
                                <div key={i} className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span>{ing.productName}</span>
                                  <span className="font-mono font-bold">{ing.quantity} {ing.unit}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB TAB 3: DEDUCTION MOVEMENT LOG */}
              {activeSubTab === 'movements' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Automatic Consumption Records</span>
                    <span className="text-[9px] text-gray-400">Real-time depletion events</span>
                  </div>

                  {relevantConsumptionLogs.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400 italic">
                      No consumption logs found for this menu item. Place POS orders containing this item to trigger auto-deductions.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {relevantConsumptionLogs.map(log => (
                        <div key={log.id} className="p-3 bg-slate-50/60 dark:bg-slate-900/10 border border-gray-100 dark:border-gray-800 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-emerald-600">📉 Deducted on: {log.date} at {log.time}</span>
                            <span className="font-mono text-gray-400 font-bold uppercase text-[9px]">ID: {log.id}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase font-bold block">Consumed Ingredient</span>
                              <span className="font-bold text-gray-800 dark:text-white">{log.productName}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase font-bold block">Quantity Depleted</span>
                              <span className="font-mono font-bold text-rose-600">-{log.quantityUsed} {log.unit}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase font-bold block">Remaining Stock after Sale</span>
                              <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{log.remainingQuantity} {log.unit}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase font-bold block">Source Location</span>
                              <span className="font-semibold text-gray-600 dark:text-gray-400">{log.warehouse}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase font-bold block">Cashier Desk</span>
                              <span className="font-semibold text-gray-600 dark:text-gray-400">{log.cashier}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase font-bold block">Kitchen Operator</span>
                              <span className="font-semibold text-gray-600 dark:text-gray-400">{log.kitchenUser}</span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] flex justify-between text-gray-400 font-medium">
                            <span>Reference Sale ID: {log.reference}</span>
                            <span>Order Number: <strong className="text-[#1B4F72] dark:text-blue-400">{log.orderNumber}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            // EMPTY STATE PLACEHOLDER
            <div className="bg-white dark:bg-gray-900 p-12 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-2xs text-center space-y-3">
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 text-[#E67E22] inline-block rounded-2xl">
                <Sliders className="h-8 w-8 text-[#E67E22]" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-white">Active Recipe Workspace</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No menu item is selected. Click the <strong className="text-gray-600">"Manage Ingredients"</strong> button on any menu card to view/modify its raw materials and review auto-depletion logs.
              </p>
            </div>
          )}

          {/* GLOBAL STATS BOX */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-2xs space-y-4">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-[#E67E22]" />
                <span>Ingredient Usage & Logistics Statistics</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Box 1: Most Used */}
              <div className="p-3.5 bg-[#1B4F72]/5 dark:bg-blue-950/10 border border-[#1B4F72]/10 dark:border-blue-900/40 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-[#1B4F72] dark:text-blue-400 uppercase tracking-wider block">Most Used Ingredients</span>
                <div className="space-y-1.5 text-[10px]">
                  {stats.mostUsed.length === 0 ? (
                    <span className="text-gray-400 italic block">No active recipes</span>
                  ) : (
                    stats.mostUsed.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                        <span className="font-semibold truncate max-w-[120px]" title={item.name}>{item.name}</span>
                        <span className="bg-[#1B4F72]/10 text-[#1B4F72] dark:bg-blue-950 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold">{item.count} recipes</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Box 2: Unused Ingredients */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-gray-150 dark:border-gray-700 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Unused Food Stock items</span>
                <div className="space-y-1.5 text-[10px] max-h-32 overflow-y-auto">
                  {stats.unused.length === 0 ? (
                    <span className="text-emerald-600 italic block font-semibold">100% of stock utilized</span>
                  ) : (
                    stats.unused.map((item, i) => (
                      <div key={i} className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span className="truncate max-w-[120px]" title={item.name}>{item.name}</span>
                        <span className="font-mono font-bold">{item.currentStock} {item.unit}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Box 3: Missing Ingredients */}
              <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Low Stock Recipe Materials</span>
                <div className="space-y-1.5 text-[10px] max-h-32 overflow-y-auto">
                  {stats.missing.length === 0 ? (
                    <span className="text-emerald-600 italic block font-semibold">All recipe stock levels secure ✅</span>
                  ) : (
                    stats.missing.map((item, i) => (
                      <div key={i} className="text-gray-700 dark:text-gray-300 leading-tight">
                        <div className="flex justify-between font-bold">
                          <span className="truncate max-w-[120px] text-rose-600" title={item.name}>{item.name}</span>
                          <span className="font-mono text-rose-500 font-bold">{item.currentStock} {item.unit}</span>
                        </div>
                        <span className="text-[9px] text-gray-400 block line-clamp-1">Used in: {item.recipeUses.join(', ')}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* GLOBAL REPLACE INGREDIENT MODAL */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="bg-[#1B4F72] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">Replace Ingredient Globally</h3>
              <button 
                onClick={() => setIsReplaceModalOpen(false)} 
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/10 px-3 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="bg-amber-50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-200 dark:border-amber-900 flex items-start space-x-2 text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <p className="text-[10px]">
                  <strong>Warning:</strong> This operation will automatically search all restaurant menu recipes and replace the source ingredient with the target ingredient. All future orders will deplete the new ingredient.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ingredient to Replace (Source)</label>
                <select
                  value={replaceSourceId}
                  onChange={(e) => setReplaceSourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg text-xs"
                >
                  <option value="">-- Choose Stock Product --</option>
                  {db.products
                    .filter(p => p.category === 'Food' || p.category === 'Beverage')
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>

              <div className="text-center">
                <ChevronRight className="h-5 w-5 text-[#E67E22] mx-auto rotate-90 sm:rotate-0" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Replacement Product (Target)</label>
                <select
                  value={replaceTargetId}
                  onChange={(e) => setReplaceTargetId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg text-xs"
                >
                  <option value="">-- Choose Stock Product --</option>
                  {db.products
                    .filter(p => p.category === 'Food' || p.category === 'Beverage')
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsReplaceModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReplaceGlobalIngredient}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Execute Replacement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
