const prisma = require('../config/prisma');

const getOrgId = async (user) => {
  if (user && user.organizationId) return user.organizationId;
  const defaultOrg = await prisma.organization.findFirst({ select: { id: true } });
  if (!defaultOrg) throw new Error("No organization found in the system.");
  return defaultOrg.id;
};


// ==========================================
// Auto-Seed Standard Enterprise Payroll Defaults
// ==========================================
async function autoSeedDefaultsForOrg(orgId) {
  try {
    const orgPrefix = String(orgId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'DEF';

    // 1. Master components
    const standardComponents = [
      { name: 'Basic Salary', defaultCode: 'BASIC', category: 'Earning', calculationType: 'Percentage', calculationBase: 'CTC', value: '50', isTaxable: true, isAutoBalance: false, sequence: 1 },
      { name: 'House Rent Allowance', defaultCode: 'HRA', category: 'Earning', calculationType: 'Percentage', calculationBase: 'Basic', value: '40', isTaxable: true, isAutoBalance: false, sequence: 2 },
      { name: 'Special Allowance', defaultCode: 'SPECIAL_ALLOWANCE', category: 'Earning', calculationType: 'Auto Balance', calculationBase: 'CTC', value: '0', isTaxable: true, isAutoBalance: true, sequence: 3 },
      { name: 'Conveyance Allowance', defaultCode: 'CONVEYANCE', category: 'Earning', calculationType: 'Fixed', calculationBase: 'CTC', value: '1600', isTaxable: false, isAutoBalance: false, sequence: 4 },
      { name: 'Medical Allowance', defaultCode: 'MEDICAL', category: 'Earning', calculationType: 'Fixed', calculationBase: 'CTC', value: '1250', isTaxable: false, isAutoBalance: false, sequence: 5 },
    ];

    const createdComponents = [];
    for (const sc of standardComponents) {
      let comp = await prisma.salaryComponent.findFirst({
        where: { organizationId: orgId, name: sc.name }
      });
      if (!comp) {
        const codeExists = await prisma.salaryComponent.findUnique({ where: { code: sc.defaultCode } });
        const finalCode = codeExists ? (sc.defaultCode + '_' + orgPrefix) : sc.defaultCode;

        try {
          comp = await prisma.salaryComponent.create({
            data: {
              organizationId: orgId,
              name: sc.name,
              code: finalCode,
              category: sc.category,
              calculationType: sc.calculationType,
              calculationBase: sc.calculationBase,
              value: sc.value,
              isTaxable: sc.isTaxable,
              isAutoBalance: sc.isAutoBalance,
              sequence: sc.sequence,
              status: 'Active'
            }
          });
        } catch (e) {
          comp = await prisma.salaryComponent.findFirst({ where: { organizationId: orgId } });
        }
      }
      if (comp) createdComponents.push(comp);
    }

    // 2. Standard Deductions
    const standardDeductions = [
      { name: 'Provident Fund (PF)', defaultCode: 'PF', category: 'PF', valueType: 'Percentage', value: '12', isPreTax: true },
      { name: 'Professional Tax (PT)', defaultCode: 'PT', category: 'ProfessionalTax', valueType: 'Fixed', value: '200', isPreTax: true }
    ];

    for (const sd of standardDeductions) {
      const existing = await prisma.deductionRule.findFirst({
        where: { organizationId: orgId, name: sd.name }
      });
      if (!existing) {
        const codeExists = await prisma.deductionRule.findUnique({ where: { code: sd.defaultCode } });
        const finalCode = codeExists ? (sd.defaultCode + '_' + orgPrefix) : sd.defaultCode;
        try {
          await prisma.deductionRule.create({
            data: {
              organizationId: orgId,
              name: sd.name,
              code: finalCode,
              category: sd.category,
              valueType: sd.valueType,
              value: sd.value,
              isPreTax: sd.isPreTax,
              status: 'Active'
            }
          });
        } catch (e) {}
      }
    }

    // 3. Tax Rule (IT tax rule)
    const existingTax = await prisma.taxRule.findFirst({ where: { organizationId: orgId } });
    if (!existingTax) {
      const standardSlabs = [
        { min: 0, max: 250000, rate: 0, baseTax: 0 },
        { min: 250000, max: 500000, rate: 5, baseTax: 0 },
        { min: 500000, max: 1000000, rate: 20, baseTax: 12500 },
        { min: 1000000, max: null, rate: 30, baseTax: 112500 }
      ];
      try {
        await prisma.taxRule.create({
          data: {
            organizationId: orgId,
            name: 'IT Tax Rule (Progressive)',
            country: 'India',
            state: null,
            slabs: JSON.stringify(standardSlabs),
            status: 'Active'
          }
        });
      } catch (e) {}
    }

    // 4. Default Salary Structure
    let defaultStruct = await prisma.salaryStructure.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: { versions: { include: { components: true } } }
    });

    if (!defaultStruct) {
      defaultStruct = await prisma.salaryStructure.findFirst({
        where: { organizationId: orgId },
        include: { versions: { include: { components: true } } }
      });
    }

    if (!defaultStruct) {
      defaultStruct = await prisma.salaryStructure.create({
        data: {
          organizationId: orgId,
          name: 'Standard Executive CTC Structure',
          description: 'Standard enterprise CTC breakdown template with Basic, HRA, and Special Allowance',
          currency: 'USD',
          isDefault: true,
          status: 'Active'
        }
      });
      const v1 = await prisma.salaryStructureVersion.create({
        data: {
          structureId: defaultStruct.id,
          version: 1,
          effectiveFrom: new Date(),
          components: {
            create: createdComponents.map((c, idx) => ({
              componentId: c.id,
              sequence: idx + 1,
              category: c.category,
              calculationType: c.calculationType,
              calculationBase: c.calculationBase,
              value: c.value,
              formula: c.formula
            }))
          }
        }
      });
      await prisma.salaryStructure.update({
        where: { id: defaultStruct.id },
        data: { currentVersionId: v1.id }
      });
    } else {
      // If default structure has 0 components, attach created components
      const latestVer = defaultStruct.versions?.[0];
      if (latestVer && (!latestVer.components || latestVer.components.length === 0) && createdComponents.length > 0) {
        await prisma.salaryStructureComponent.createMany({
          data: createdComponents.map((c, idx) => ({
            versionId: latestVer.id,
            componentId: c.id,
            sequence: idx + 1,
            category: c.category,
            calculationType: c.calculationType,
            calculationBase: c.calculationBase,
            value: c.value,
            formula: c.formula
          }))
        });
      }
    }

    // 5. Connect active employees to the default structure
    const employees = await prisma.employeeProfile.findMany({
      where: { organizationId: orgId }
    });

    for (const emp of employees) {
      const comp = await prisma.compensationProfile.findUnique({
        where: { employeeId: emp.id }
      });
      const monthly = emp.baseSalary || 5000;
      if (!comp) {
        await prisma.compensationProfile.create({
          data: {
            employeeId: emp.id,
            salaryStructureId: defaultStruct.id,
            salaryVersionId: defaultStruct.currentVersionId,
            monthlyCTC: monthly,
            annualCTC: monthly * 12,
            effectiveDate: new Date(),
            status: 'Active'
          }
        });
      } else if (!comp.salaryStructureId) {
        await prisma.compensationProfile.update({
          where: { id: comp.id },
          data: {
            salaryStructureId: defaultStruct.id,
            salaryVersionId: defaultStruct.currentVersionId
          }
        });
      }
    }

    return { components: createdComponents, defaultStruct };
  } catch (err) {
    console.warn('AutoSeed notice:', err.message);
    return null;
  }
}

// ==========================================
// 1. Salary Structures (Templates)
// ==========================================
exports.getSalaryStructures = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const structCount = await prisma.salaryStructure.count({ where: { organizationId: orgId } });
    const compCount = await prisma.salaryComponent.count({ where: { organizationId: orgId } });
    if (structCount === 0 || compCount === 0) {
      await autoSeedDefaultsForOrg(orgId);
    }
    const structures = await prisma.salaryStructure.findMany({
      where: { organizationId: orgId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            components: {
              include: { component: true },
              orderBy: { sequence: 'asc' }
            },
            compensations: {
              include: {
                employee: {
                  select: {
                    id: true,
                    fullName: true,
                    employeeId: true,
                    designation: true,
                    joiningDate: true,
                    lifecycleStatus: true,
                    department: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true, email: true, isActive: true, status: true } }
                  }
                }
              }
            }
          }
        },
        compensations: {
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                designation: true,
                joiningDate: true,
                lifecycleStatus: true,
                department: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true, isActive: true, status: true } }
              }
            }
          }
        },
        _count: {
          select: { compensations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSalaryStructure = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { name, description, country, state, currency, isDefault, components = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Structure name is required.' });
    }

    // If marked as default, unset any previous default structure in this org
    if (isDefault) {
      await prisma.salaryStructure.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create Structure and Version 1 in a transaction
    const structure = await prisma.$transaction(async (tx) => {
      const createdStruct = await tx.salaryStructure.create({
        data: {
          organizationId: orgId,
          name: name.trim(),
          description: description?.trim() || null,
          country: country || 'Universal',
          state: state || null,
          currency: currency || 'USD',
          isDefault: !!isDefault,
          status: 'Active'
        }
      });

      const version1 = await tx.salaryStructureVersion.create({
        data: {
          structureId: createdStruct.id,
          version: 1,
          effectiveFrom: new Date(),
          components: {
            create: components.map((c, idx) => ({
              componentId: c.componentId,
              sequence: Number(c.sequence || idx + 1),
              category: c.category || null,
              calculationType: c.calculationType || null,
              calculationBase: c.calculationBase || null,
              value: c.value ? String(c.value) : null,
              formula: c.formula || null
            }))
          }
        }
      });

      const finalStruct = await tx.salaryStructure.update({
        where: { id: createdStruct.id },
        data: { currentVersionId: version1.id },
        include: {
          versions: {
            include: {
              components: {
                include: { component: true },
                orderBy: { sequence: 'asc' }
              }
            }
          },
          _count: { select: { compensations: true } }
        }
      });

      return finalStruct;
    });

    res.status(201).json({ success: true, data: structure, message: 'Salary structure created successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { id } = req.params;
    const { name, description, country, state, currency, status, isDefault, components } = req.body;

    const existing = await prisma.salaryStructure.findFirst({
      where: { id, organizationId: orgId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { components: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Salary structure not found.' });
    }

    if (isDefault) {
      await prisma.salaryStructure.updateMany({
        where: { organizationId: orgId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const structUpdate = {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() : existing.description,
        country: country !== undefined ? country : existing.country,
        state: state !== undefined ? state : existing.state,
        currency: currency !== undefined ? currency : existing.currency,
        status: status !== undefined ? status : existing.status,
        isDefault: isDefault !== undefined ? !!isDefault : existing.isDefault
      };

      let currentVersionId = existing.currentVersionId;

      // If components are passed, update or create version
      if (Array.isArray(components)) {
        const latestVersionNum = existing.versions[0]?.version || 1;
        const newVersionNum = latestVersionNum + 1;

        const newVersion = await tx.salaryStructureVersion.create({
          data: {
            structureId: id,
            version: newVersionNum,
            effectiveFrom: new Date(),
            components: {
              create: components.map((c, idx) => ({
                componentId: c.componentId,
                sequence: Number(c.sequence || idx + 1),
                category: c.category || null,
                calculationType: c.calculationType || null,
                calculationBase: c.calculationBase || null,
                value: c.value ? String(c.value) : null,
                formula: c.formula || null
              }))
            }
          }
        });
        currentVersionId = newVersion.id;
      }

      return tx.salaryStructure.update({
        where: { id },
        data: {
          ...structUpdate,
          currentVersionId
        },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            include: {
              components: {
                include: { component: true },
                orderBy: { sequence: 'asc' }
              }
            }
          },
          _count: { select: { compensations: true } }
        }
      });
    });

    res.json({ success: true, data: updated, message: 'Salary structure updated successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSalaryStructure = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { id } = req.params;

    const existing = await prisma.salaryStructure.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: { select: { compensations: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Salary structure not found.' });
    }

    if (existing._count?.compensations > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${existing._count.compensations} employee(s) are actively assigned to this salary structure. Please reassign them first.`
      });
    }

    await prisma.salaryStructure.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Salary structure deleted successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.setDefaultSalaryStructure = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { id } = req.params;

    await prisma.$transaction([
      prisma.salaryStructure.updateMany({
        where: { organizationId: orgId },
        data: { isDefault: false }
      }),
      prisma.salaryStructure.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);

    res.json({ success: true, message: 'Default salary structure updated.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. Salary Components
// ==========================================
exports.getSalaryComponents = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const count = await prisma.salaryComponent.count({ where: { organizationId: orgId } });
    if (count === 0) {
      await autoSeedDefaultsForOrg(orgId);
    }
    const components = await prisma.salaryComponent.findMany({
      where: { organizationId: orgId },
      orderBy: [{ sequence: 'asc' }, { displayOrder: 'asc' }]
    });
    res.json({ success: true, data: components });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSalaryComponent = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { 
      name, code, category, calculationType, calculationBase, 
      value, formula, sequence, isTaxable, isAutoBalance, 
      isEmployerContribution, isEmployeeDeduction, roundingRule, displayOrder 
    } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Component name and unique code are required.' });
    }

    // Auto Balance validation
    if (isAutoBalance) {
      const existing = await prisma.salaryComponent.findFirst({
        where: { organizationId: orgId, isAutoBalance: true }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: "Only one Auto Balance component is allowed per organization." });
      }
    }

    const finalEmployerContribution = category === 'Employer Contribution' || !!isEmployerContribution;
    const finalEmployeeDeduction = category === 'Deduction' || !!isEmployeeDeduction;

    const component = await prisma.salaryComponent.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category: category || 'Earning',
        calculationType: calculationType || 'Fixed',
        calculationBase: calculationBase || 'Basic',
        value: String(value || "0"),
        formula: formula || null,
        sequence: Number(sequence || 0),
        isTaxable: isTaxable !== undefined ? !!isTaxable : true,
        isAutoBalance: !!isAutoBalance,
        isEmployerContribution: finalEmployerContribution,
        isEmployeeDeduction: finalEmployeeDeduction,
        roundingRule: roundingRule || "Nearest",
        displayOrder: Number(displayOrder || 0),
        status: "Active"
      }
    });

    res.status(201).json({ success: true, data: component, message: 'Salary component created successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSalaryComponent = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { id } = req.params;
    const component = await prisma.salaryComponent.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!component) return res.status(404).json({ success: false, message: 'Salary component not found.' });

    if (req.body.isAutoBalance) {
      const existing = await prisma.salaryComponent.findFirst({
        where: { organizationId: orgId, isAutoBalance: true, id: { not: id } }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: "Only one Auto Balance component is allowed per organization." });
      }
    }

    const data = { ...req.body };
    if (data.code) data.code = data.code.trim().toUpperCase();
    if (data.value !== undefined) data.value = String(data.value);
    if (data.sequence !== undefined) data.sequence = Number(data.sequence);
    if (data.displayOrder !== undefined) data.displayOrder = Number(data.displayOrder);

    const updated = await prisma.salaryComponent.update({
      where: { id },
      data
    });
    res.json({ success: true, data: updated, message: 'Salary component updated successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSalaryComponent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if component is in use in salary structure components
    const structureUsageCount = await prisma.salaryStructureComponent.count({
      where: { componentId: id }
    });
    if (structureUsageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: Component is used in ${structureUsageCount} salary structure template(s). Remove it from the structures first.`
      });
    }

    await prisma.salaryComponent.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Salary component deleted successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. Deduction Rules
// ==========================================
exports.getDeductions = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const count = await prisma.deductionRule.count({ where: { organizationId: orgId } });
    if (count === 0) {
      await autoSeedDefaultsForOrg(orgId);
    }
    const deductions = await prisma.deductionRule.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: deductions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDeduction = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { name, code, category, valueType, value, isPreTax, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Deduction name and code are required.' });
    }

    const deduction = await prisma.deductionRule.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category: category || 'PF',
        valueType: valueType || 'Fixed',
        value: String(value || "0"),
        isPreTax: !!isPreTax,
        status: status || 'Active'
      }
    });

    res.status(201).json({ success: true, data: deduction, message: 'Deduction rule created successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.code) data.code = data.code.trim().toUpperCase();
    if (data.value !== undefined) data.value = String(data.value);

    const updated = await prisma.deductionRule.update({
      where: { id },
      data
    });
    res.json({ success: true, data: updated, message: 'Deduction rule updated successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.deductionRule.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Deduction rule deleted successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. Tax Rules
// ==========================================
exports.getTaxRules = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const count = await prisma.taxRule.count({ where: { organizationId: orgId } });
    if (count === 0) {
      await autoSeedDefaultsForOrg(orgId);
    }
    const taxes = await prisma.taxRule.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: taxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTaxRule = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { name, country, state, slabs, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tax rule name is required.' });
    }

    // Validate slabs JSON string or object
    let finalSlabs = '[]';
    if (typeof slabs === 'string') {
      try {
        JSON.parse(slabs);
        finalSlabs = slabs;
      } catch {
        finalSlabs = JSON.stringify([{ description: slabs }]);
      }
    } else if (Array.isArray(slabs) || typeof slabs === 'object') {
      finalSlabs = JSON.stringify(slabs);
    }

    const tax = await prisma.taxRule.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        country: country || 'Universal',
        state: state || null,
        slabs: finalSlabs,
        status: status || 'Active'
      }
    });

    res.status(201).json({ success: true, data: tax, message: 'Tax rule created successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateTaxRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, state, slabs, status } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (country !== undefined) data.country = country;
    if (state !== undefined) data.state = state;
    if (status !== undefined) data.status = status;

    if (slabs !== undefined) {
      if (typeof slabs === 'string') {
        try {
          JSON.parse(slabs);
          data.slabs = slabs;
        } catch {
          data.slabs = JSON.stringify([{ description: slabs }]);
        }
      } else if (Array.isArray(slabs) || typeof slabs === 'object') {
        data.slabs = JSON.stringify(slabs);
      }
    }

    const updated = await prisma.taxRule.update({
      where: { id },
      data
    });

    res.json({ success: true, data: updated, message: 'Tax rule updated successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteTaxRule = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.taxRule.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Tax rule deleted successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. Approval Workflows
// ==========================================
exports.getWorkflows = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const workflows = await prisma.approvalWorkflow.findMany({
      where: { organizationId: orgId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });
    res.json({ success: true, data: workflows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createWorkflow = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { name, module, steps } = req.body;
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        organizationId: orgId,
        name,
        module,
        steps: {
          create: steps || []
        }
      },
      include: { steps: true }
    });
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. Bulk Assign Employees to Structure
// ==========================================
exports.assignEmployeesToStructure = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const { id } = req.params;
    const { employeeIds = [] } = req.body;

    const structure = await prisma.salaryStructure.findFirst({
      where: { id, organizationId: orgId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found.' });
    }

    const versionId = structure.currentVersionId || structure.versions?.[0]?.id || null;

    const profiles = await prisma.employeeProfile.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { id: { in: employeeIds } },
          { userId: { in: employeeIds } },
          { employeeId: { in: employeeIds } }
        ]
      }
    });

    let assigned = 0;
    for (const profile of profiles) {
      const existingComp = await prisma.compensationProfile.findUnique({
        where: { employeeId: profile.id }
      });

      if (existingComp) {
        await prisma.compensationProfile.update({
          where: { id: existingComp.id },
          data: {
            salaryStructureId: id,
            salaryVersionId: versionId,
            status: 'Active'
          }
        });
      } else {
        const monthly = profile.baseSalary || 5000;
        await prisma.compensationProfile.create({
          data: {
            employeeId: profile.id,
            salaryStructureId: id,
            salaryVersionId: versionId,
            monthlyCTC: monthly,
            annualCTC: monthly * 12,
            effectiveDate: new Date(),
            status: 'Active'
          }
        });
      }
      assigned++;
    }

    res.json({
      success: true,
      message: assigned + ' employee(s) assigned to ' + structure.name + ' successfully.',
      assignedCount: assigned
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 6. Explicit Seed Defaults Endpoint
// ==========================================
exports.seedDefaults = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const result = await autoSeedDefaultsForOrg(orgId);
    res.json({
      success: true,
      message: 'Standard enterprise payroll configuration initialized successfully.',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};