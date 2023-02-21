namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addColEmaiilList : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.EmailLists", "IsActive", c => c.Boolean(nullable: false));
            AddColumn("dbo.EmailLists", "ActivationCode", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.EmailLists", "ActivationCode");
            DropColumn("dbo.EmailLists", "IsActive");
        }
    }
}
